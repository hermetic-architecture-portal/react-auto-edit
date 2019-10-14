import { observable } from 'mobx';
import utils from './utils';
import ItemStore from './ItemStore';
import ItemContainer from './ItemContainer';
import UIFactory from './UIFactory';
import constants from './constants';

/**
 * @typedef {import('./ApiProxy').default} ApiProxy
 */

/**
 * @typedef {Object} Options
 * @property {string} baseClientPath - If the edit pages are to be based on a path other than the web root, provide it here (e.g /editors)
 * @property {UIFactory} uiFactory - If you want to override the standard UI elements, provide an instance of a class that subclasses UIFactory here
 */

class Controller {
  /**
   * @param {*} schema - the Joi schema
   * @param {ApiProxy} apiProxy
   * @param {Options} options
   */
  constructor(schema, apiProxy, options) {
    const defaultOptions = {
      baseClientPath: '',
      uiFactory: false,
    };
    const fullOptions = Object.assign(defaultOptions, options || {});
    this.schema = schema;
    this.apiProxy = apiProxy;
    this.baseClientPath = fullOptions.baseClientPath;
    this.itemStore = new ItemStore(schema);
    this.searchResultPages = observable.map({});
    /**
     * @type {UIFactory}
     */
    this.uiFactory = fullOptions.uiFactory || new UIFactory();
  }

  isDirty() {
    return this.itemStore.isDirty();
  }

  hasErrors() {
    return this.itemStore.hasErrors();
  }

  async cancel() {
    this.itemStore.cancel();
  }

  /**
   * @param {boolean} force - forces the controller to attempt to save, even if there are client side validation errors outstanding
   */
  async save(force) {
    if (this.hasErrors()) {
      if (force) {
        console.warn('Saving in spite of errors...');
      } else {
        this.uiFactory.alert('Sorry, the changes cannot be saved as there are validation errors that need to be corrected first');
        return;
      }
    }
    const dirtyContainers = this.itemStore.getDirtyContainers();
    try {
      for (let i = 0; i < dirtyContainers.length; i += 1) {
        const container = dirtyContainers[i];
        const cleanItem = container.getCleanItem();
        this.itemStore.fixParentIds(container);
        const cleanParentIds = container.getCleanParentIds();
        let saveResponse;
        switch (container.metadata.changeType) {
          case ItemContainer.changeTypes.delete:
            // eslint-disable-next-line no-await-in-loop
            await this.apiProxy.deleteItem(
              `${container.metadata.collectionSchemaPath}.[]`,
              cleanParentIds,
              cleanItem,
            );
            break;
          case ItemContainer.changeTypes.add:
            // eslint-disable-next-line no-await-in-loop
            saveResponse = await this.apiProxy.postItem(
              container.metadata.collectionSchemaPath,
              cleanParentIds,
              cleanItem,
            );
            if (saveResponse && utils.hasGeneratedField(container.itemSchemaDesc)) {
              container.replaceItem(saveResponse);
            }
            break;
          case ItemContainer.changeTypes.edit:
            // eslint-disable-next-line no-await-in-loop
            await this.apiProxy.putItem(
              `${container.metadata.collectionSchemaPath}.[]`,
              cleanParentIds,
              cleanItem,
            );
            break;
          default:
            throw new Error('Unsupported changeType');
        }
        this.itemStore.finaliseContainer(container);
        this.handleSaveSuccess();
      }
    } catch (e) {
      this.handleError(e, 'Save');
    }
  }

  // placeholder for anyone who wants to perform an action
  // on save success
  handleSaveSuccess() {
  }

  handleError(error, action) {
    console.error(action, error);
    this.uiFactory.alert(`Error performing ${action}: ${error.message}`, 'Error');
    throw error;
  }

  /**
   * @param {ItemContainer} container
   * @param {string} fieldName
   */
  constructLinkUrl(container, fieldName) {
    const schemaPathChunks = container.metadata.collectionSchemaPath
      .split('.')
      .filter(chunk => !!chunk);
    schemaPathChunks.push('[]');
    const urlParts = [];
    let currentSchemaPath = '';
    let parentIdsIndex = 0;
    schemaPathChunks.forEach((pathChunk, index) => {
      if (pathChunk === '[]') {
        let ids;
        let isNew = false;
        if (index === schemaPathChunks.length - 1) {
          ids = container.getIds();
          isNew = container.isNewItem();
        } else {
          const parentContainer = this.itemStore.findContainer(
            currentSchemaPath,
            container.metadata.parentIds
              .filter((item, parentIndex) => parentIndex < parentIdsIndex),
            container.metadata.parentIds[parentIdsIndex],
          );
          if (parentContainer) {
            ids = parentContainer.getIds();
            isNew = parentContainer.isNewItem();
          } else {
            ids = container.metadata.parentIds[parentIdsIndex];
          }
          parentIdsIndex += 1;
        }
        const currentSchemaDesc = utils.reach(this.schema, `${currentSchemaPath}.[]`).describe();
        const primaryKeyFields = utils.getPrimaryKeyFieldNames(currentSchemaDesc);
        const keyValues = primaryKeyFields
          .map(pk => encodeURIComponent(ids[pk]));
        if (isNew) {
          keyValues.push(encodeURIComponent(ids[constants.internalIdField]));
        }
        urlParts.push(...keyValues);
      } else {
        urlParts.push(pathChunk);
      }
      currentSchemaPath = currentSchemaPath ? `${currentSchemaPath}.${pathChunk}`
        : pathChunk;
    });
    urlParts.push(fieldName);
    return `${this.baseClientPath}/${urlParts.join('/')}`;
  }

  _shouldLoadSearchResult(parentIds) {
    // should not attempt to load child collection from server side
    // if one of the parents is a new item (since children can't exist server side)
    return !parentIds.some(parentIdSet => this.itemStore.containers
      .some(c => (c.item[constants.internalIdField] === parentIdSet[constants.internalIdField])
        && c.isNewItem()));
  }

  async loadSearchResult(collectionSchemaPath, parentIds, page, filter) {
    if (!this._shouldLoadSearchResult(parentIds)) {
      this.searchResultPages.set(collectionSchemaPath, 1);
      return;
    }
    try {
      const data = await this.apiProxy
        .fetchCollectionSummary(collectionSchemaPath, parentIds, page, filter);
      this.itemStore.load(collectionSchemaPath, parentIds, data.items,
        ItemContainer.detailLevel.summary, ItemContainer.owner.collectionSearch);
      this.searchResultPages.set(collectionSchemaPath, data.totalPages);
    } catch (e) {
      this.handleError(e, 'Load Search Results');
    }
  }

  /**
   * @param {ItemContainer} container
   */
  async loadFkLookupData(container, fieldName, filter) {
    try {
      const fkMetadata = container.getForeignKeyMetadata(fieldName);
      if (!fkMetadata.fkParentIds) {
        return;
      }
      const data = await this.apiProxy
        .fetchCollectionSummary(
          fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, 1, filter,
        );
      this.itemStore.load(fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, data.items,
        ItemContainer.detailLevel.summary, ItemContainer.owner.lookupSearch);
    } catch (e) {
      this.handleError(e, 'Load Lookup Data');
    }
  }

  /**
   * @param {ItemContainer} container
   */
  getLookupItemContainer(container, fieldName) {
    const fkMetadata = container.getForeignKeyMetadata(fieldName);
    if (!fkMetadata.fkParentIds) {
      return null;
    }
    const currentValue = container.getItemFieldValue(fieldName);
    const currentLookupItemIds = {};
    currentLookupItemIds[fkMetadata.fkTargetFieldName] = currentValue;
    const lookupContainer = this.itemStore.findContainer(
      fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, currentLookupItemIds,
    );
    return lookupContainer;
  }

  /**
   * @param {ItemContainer} container
   * @param {ItemContainer} fkContainer
   */
  setLookupItemContainer(container, fieldName, fkContainer) {
    if (!fkContainer) {
      container.setItemFieldValue(fieldName, fkContainer);
    } else {
      const fkMetadata = container.getForeignKeyMetadata(fieldName);
      const keyValue = fkContainer.getItemFieldValue(fkMetadata.fkTargetFieldName);
      fkContainer.registerOwner(ItemContainer.owner.lookupInUse);
      container.setItemFieldValue(fieldName, keyValue);
    }
    // changed parent fk - clear child fks
    container.getChildFkFieldNames(fieldName).forEach((childFieldName) => {
      container.setItemFieldValue(childFieldName, undefined);
    });
  }

  /**
   * @param {ItemContainer} container
   */
  getLookupData(container, fieldName) {
    const fkMetadata = container.getForeignKeyMetadata(fieldName);
    if (!fkMetadata.fkParentIds) {
      return null;
    }
    return this.itemStore.getContainers(
      fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, ItemContainer.owner.lookupSearch,
    );
  }

  getSearchResult(collectionSchemaPath, parentIds) {
    return {
      totalPages: this.searchResultPages.get(collectionSchemaPath),
      containers: this.itemStore.getContainers(
        collectionSchemaPath, parentIds, ItemContainer.owner.collectionSearch,
      ),
    };
  }

  /**
   * @param {ItemContainer} container
   */
  async loadDetail(container) {
    try {
      if (container.metadata.detailLevel !== ItemContainer.detailLevel.detail) {
        if (this.apiProxy
          .collectionSummaryIncludesFullEntities(container.metadata.collectionSchemaPath)) {
          // the API method to get collection summary returns full details so we don't need
          // to call a REST API, just flag the existing container
          container.upgradeSummaryToDetail(container.item);
          return;
        }
        const data = await this.apiProxy.fetchItemDetail(
          `${container.metadata.collectionSchemaPath}.[]`,
          container.metadata.parentIds, container.item,
        );
        const fkFieldNames = Object.getOwnPropertyNames(container.itemSchemaDesc.children)
          .filter(fieldName => utils
            .isFkField(utils
              .normaliseAlternativesSchema(container.itemSchemaDesc.children[fieldName])));
        for (let i = 0; i < fkFieldNames.length; i += 1) {
          const fieldName = fkFieldNames[i];
          if (data && (typeof data[fieldName] !== 'undefined')
            && (data[fieldName] !== null)) {
            // need to load the summary for the fk lookup item so we can show the display name in the select box
            const tempContainer = new ItemContainer(container.metadata.collectionSchemaPath,
              container.metadata.parentIds, this.schema, container.itemSchemaDesc,
              data, ItemContainer.detailLevel.detail, ItemContainer.owner.detail,
              ItemContainer.changeTypes.none);
            const fkMetadata = tempContainer.getForeignKeyMetadata(fieldName);
            if (fkMetadata.fkParentIds) {
              const currentLookupItemIds = {};
              currentLookupItemIds[fkMetadata.fkTargetFieldName] = data[fieldName];

              const currentLookupItemContainer = this.itemStore.findContainer(
                fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, currentLookupItemIds,
              );

              if (currentLookupItemContainer) {
                this.itemStore.registerItemOwner(
                  fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds,
                  currentLookupItemIds, ItemContainer.owner.lookupInUse,
                );
              } else {
                // eslint-disable-next-line no-await-in-loop
                const summary = await this.apiProxy.fetchItemSummary(
                  fkMetadata.fkItemSchemaPath, fkMetadata.fkParentIds, currentLookupItemIds,
                );
                this.itemStore.load(
                  fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, [summary],
                  ItemContainer.detailLevel.summary, ItemContainer.owner.lookupInUse,
                );
              }
            }
          }
        }
        container.registerOwner(ItemContainer.owner.detail);
        container.upgradeSummaryToDetail(data);
      }
    } catch (e) {
      this.handleError(e, 'Load Detail');
    }
  }

  addContainer(collectionSchemaPath, parentIds) {
    return this.itemStore.addContainer(collectionSchemaPath, parentIds);
  }

  /**
   * @param {ItemContainer} container
   */
  deleteContainer(container) {
    container.delete();
  }
}

export default Controller;
