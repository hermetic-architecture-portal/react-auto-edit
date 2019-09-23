import { observable } from 'mobx';
import utils from './utils';
import ItemStore from './ItemStore';
import ItemContainer from './ItemContainer';
import UIFactory from './UIFactory';

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

  dirty() {
    return this.itemStore.isDirty();
  }

  hasErrors() {
    return this.itemStore.hasErrors();
  }

  async cancel() {
    this.itemStore.cancel();
  }

  async save() {
    const dirtyItems = this.itemStore.getDirtyItems();
    try {
      for (let i = 0; i < dirtyItems.length; i += 1) {
        const dirtyItem = dirtyItems[i];
        switch (dirtyItem.changeType) {
          case ItemContainer.changeTypes.delete:
            // eslint-disable-next-line no-await-in-loop
            await this.apiProxy.deleteItem(
              `${dirtyItem.collectionSchemaPath}.[]`,
              dirtyItem.cleanParentIds,
              dirtyItem.cleanItem,
            );
            break;
          case ItemContainer.changeTypes.add:
            // eslint-disable-next-line no-await-in-loop
            dirtyItem.saveResponse = await this.apiProxy.postItem(
              dirtyItem.collectionSchemaPath,
              dirtyItem.cleanParentIds,
              dirtyItem.cleanItem,
            );
            break;
          case ItemContainer.changeTypes.edit:
            // eslint-disable-next-line no-await-in-loop
            await this.apiProxy.putItem(
              `${dirtyItem.collectionSchemaPath}.[]`,
              dirtyItem.cleanParentIds,
              dirtyItem.cleanItem,
            );
            break;
          default:
            throw new Error('Unsupported changeType');
        }
        dirtyItem.saved = true;
      }
      // window.location.reload();
    } catch (e) {
      console.error('Save error', e);
    }
    this.itemStore.finaliseDirtyItems(dirtyItems);
  }

  constructLinkUrl(itemSchemaPath, fieldName, parentIds, ids, schemaDesc, urlSoFar) {
    const actualUrlSoFar = urlSoFar || this.baseClientPath;
    const actualSchemaDesc = schemaDesc || this.schema.describe();
    const schemaPathChunks = itemSchemaPath
      .split('.')
      .filter(chunk => !!chunk);
    if (!schemaPathChunks.length) {
      return `${urlSoFar}/${fieldName}`;
    }
    const currentChunk = schemaPathChunks[0];
    const nextSchemaPath = schemaPathChunks
      .filter((item, index) => index > 0)
      .join('.');
    if (currentChunk === '[]') {
      const nextSchemaDesc = actualSchemaDesc.items[0];
      const idItem = parentIds.length ? parentIds[0] : ids;
      const keys = utils.getPrimaryKeyFieldNames(nextSchemaDesc)
        .map(pk => encodeURIComponent(idItem[pk]))
        .join('/');
      const nextParentIds = parentIds
        .filter((item, index) => index > 0);
      const nextUrl = `${actualUrlSoFar}/${keys}`;
      return this.constructLinkUrl(
        nextSchemaPath, fieldName, nextParentIds, ids, nextSchemaDesc, nextUrl,
      );
    }
    const nextSchemaDesc = actualSchemaDesc.children[currentChunk];
    const nextUrl = `${actualUrlSoFar}/${currentChunk}`;
    return this.constructLinkUrl(
      nextSchemaPath, fieldName, parentIds, ids, nextSchemaDesc, nextUrl,
    );
  }

  async loadSearchResult(collectionSchemaPath, parentIds, page, filter) {
    const data = await this.apiProxy
      .fetchCollectionSummary(collectionSchemaPath, parentIds, page, filter);
    this.itemStore.load(collectionSchemaPath, parentIds, data.items,
      ItemContainer.detailLevel.summary, ItemContainer.owner.collectionSearch);
    this.searchResultPages.set(collectionSchemaPath, data.totalPages);
  }

  /**
   * @param {ItemContainer} container
   */
  async loadFkLookupData(container, fieldName, filter) {
    const fkMetadata = container.getForeignKeyMetadata(fieldName);
    if (!fkMetadata.fkParentIds) {
      return;
    }
    const data = await this.apiProxy
      .fetchCollectionSummary(fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, 1, filter);

    this.itemStore.load(fkMetadata.fkCollectionSchemaPath, fkMetadata.fkParentIds, data.items,
      ItemContainer.detailLevel.summary, ItemContainer.owner.lookupSearch);
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
    if (container.metadata.detailLevel !== ItemContainer.detailLevel.detail) {
      const data = await this.apiProxy.fetchItemDetail(
        `${container.metadata.collectionSchemaPath}.[]`,
        container.metadata.parentIds, container.item,
      );
      const fkFieldNames = Object.getOwnPropertyNames(container.itemSchemaDesc.children)
        .filter(fieldName => utils.isFkField(container.itemSchemaDesc.children[fieldName]));
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
