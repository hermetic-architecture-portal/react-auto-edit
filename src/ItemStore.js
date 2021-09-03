import { observable } from 'mobx';
import clone from 'clone-deep';
import utils from './utils';
import ItemContainer from './ItemContainer';
import constants from './constants';

class ItemStore {
  constructor(schema) {
    this.schema = schema;
    this.masterSchemaDesc = schema.describe();
    this.containers = observable([]);
    this.schemaDescriptions = observable.map({});
    this.toObject = this.toObject.bind(this);
  }

  isDirty() {
    return this.containers.some(container => container.isDirty());
  }

  hasErrors() {
    return this.containers.some(container => container.metadata.errors.length);
  }

  cancel() {
    const addedItems = this.containers
      .filter(c => c.metadata.changeType === ItemContainer.changeTypes.add);
    addedItems.forEach(c => this.containers.remove(c));
    this.containers.forEach(c => c.revert());
  }

  _getItemSchemaDesc(collectionSchemaPath) {
    if (this.schemaDescriptions.has(collectionSchemaPath)) {
      return this.schemaDescriptions.get(collectionSchemaPath);
    }
    const itemSchemaDesc = utils.reach(this.schema, `${collectionSchemaPath}.[]`)
      .describe();
    this.schemaDescriptions.set(collectionSchemaPath, itemSchemaDesc);
    return itemSchemaDesc;
  }

  /**
   * @return {ItemContainer[]}
   */
  getContainers(collectionSchemaPath, parentIds, owner) {
    let containers = this.containers.filter(match => match
      .matches(collectionSchemaPath, parentIds));
    if (owner) {
      containers = containers.filter(c => c.metadata.owners.includes(owner));

      if (owner === ItemContainer.owner.collectionSearch) {
        // for a collection view screen do include newly created and unsaved items
        const newContainers = this.getContainers(collectionSchemaPath, parentIds)
          .filter(c => (!containers.includes(c))
          && (c.metadata.changeType === ItemContainer.changeTypes.add));
        containers = newContainers.concat(containers);
      }

      if ((owner === ItemContainer.owner.lookupSearch)
        || (owner === ItemContainer.owner.collectionSearch)) {
        containers = containers
          .filter(c => c.metadata.changeType !== ItemContainer.changeTypes.delete);
      }
    }
    return containers;
  }

  /**
   * @return {ItemContainer}
   */
  findContainer(collectionSchemaPath, parentIds, ids, detailLevel) {
    return this.containers.find(match => match
      .matches(collectionSchemaPath, parentIds, ids, detailLevel));
  }

  registerItemOwner(collectionSchemaPath, parentIds, ids, owner) {
    const container = this.findContainer(collectionSchemaPath, parentIds, ids);
    container.registerOwner(owner);
  }

  addContainer(collectionSchemaPath, parentIds) {
    const item = {};
    const container = new ItemContainer(collectionSchemaPath, parentIds,
      this.schema, this._getItemSchemaDesc(collectionSchemaPath), item,
      ItemContainer.detailLevel.detail, ItemContainer.owner.detail,
      ItemContainer.changeTypes.add, this.toObject);
    this.containers.unshift(container);
    return container;
  }

  _purge(collectionSchemaPath, parentIds, owner) {
    if (![ItemContainer.owner.collectionSearch, ItemContainer.owner.lookupSearch]
      .includes(owner)) {
      return;
    }
    const containers = this.getContainers(collectionSchemaPath, parentIds);
    containers.forEach((c) => {
      c.deregisterOwner(owner);
      if (c.isOrphan()) {
        this.containers.remove(c);
      }
    });
  }

  load(collectionSchemaPath, parentIds, items, detailLevel, owner) {
    this._purge(collectionSchemaPath, parentIds, owner);
    items.forEach((item) => {
      const itemIds = ItemContainer
        .getIdsFromItem(item, this._getItemSchemaDesc(collectionSchemaPath));
      const existingItem = this.findContainer(collectionSchemaPath, parentIds, itemIds);
      if (!existingItem) {
        this.containers.push(new ItemContainer(
          collectionSchemaPath, parentIds,
          this.schema, this._getItemSchemaDesc(collectionSchemaPath),
          item, detailLevel, owner,
          ItemContainer.changeTypes.none,
          this.toObject,
        ));
      } else {
        existingItem.registerOwner(owner);
        if (detailLevel === ItemContainer.detailLevel.detail) {
          existingItem.upgradeSummaryToDetail(item);
        }
      }
    });
  }

  static _pokeItemIntoPath(item, itemIds, path, schemaDesc, parentIds, data) {
    const pathChunks = path.split('.').filter(chunk => !!chunk);
    if (pathChunks.length === 0) {
      if (!data.find(match => ItemContainer.idsMatch(itemIds, match))) {
        data.push(clone(item));
      }
      return;
    }
    const currentChunk = pathChunks[0];
    if (currentChunk === '[]') {
      if (parentIds.length) {
        const nextParentIds = parentIds.filter((x, index) => index > 0);
        const nextSchemaDesc = schemaDesc.items[0];
        const nextPath = pathChunks.filter((x, index) => index > 0).join('.');

        let nextData = data.find(match => ItemContainer.idsMatch(
          ItemContainer.getIdsFromItem(match, nextSchemaDesc),
          parentIds[0],
        ));
        if (!nextData) {
          nextData = clone(parentIds[0]);
          data.push(nextData);
        }
        ItemStore
          ._pokeItemIntoPath(item, itemIds, nextPath, nextSchemaDesc, nextParentIds, nextData);
      } else {
        throw Error('Unexpected path');
      }
    } else {
      const nextPath = pathChunks.filter((x, index) => index > 0).join('.');
      const nextSchemaDesc = schemaDesc.keys[currentChunk];
      if (nextSchemaDesc.type === 'array') {
        // eslint-disable-next-line no-param-reassign
        data[currentChunk] = data[currentChunk] || [];
      } else {
        // eslint-disable-next-line no-param-reassign
        data[currentChunk] = data[currentChunk] || {};
      }
      ItemStore
        ._pokeItemIntoPath(item, itemIds, nextPath, nextSchemaDesc, parentIds, data[currentChunk]);
    }
  }

  static _recursiveCleanIids(data) {
    if (Array.isArray(data)) {
      data.forEach(item => ItemStore._recursiveCleanIids(item));
    } else {
      Object.getOwnPropertyNames(data)
        .forEach((fieldName) => {
          if (Array.isArray(data[fieldName])) {
            ItemStore._recursiveCleanIids(data[fieldName]);
          }
        });
      if (data[constants.internalIdField]) {
        // eslint-disable-next-line no-param-reassign
        delete data[constants.internalIdField];
      }
    }
  }

  toObject() {
    const result = {};
    this.containers.forEach((container) => {
      ItemStore._pokeItemIntoPath(
        container.item, container.getIds(),
        container.metadata.collectionSchemaPath, this.masterSchemaDesc,
        container.metadata.parentIds, result,
      );
    });

    ItemStore._recursiveCleanIids(result);

    return result;
  }

  validate(collectionSchemaPath, parentIds, ids) {
    const container = this.findContainer(collectionSchemaPath, parentIds, ids);
    container.validate(this.toObject());
  }

  /**
   * @returns {ItemContainer[]}
   */
  getDirtyContainers() {
    return this.containers
      .filter(c => c.isDirty())
      .sort((a, b) => a.changeSequence - b.changeSequence);
  }

  /**
   *
   * @param {ItemContainer} container
   */
  fixParentIds(container) {
    const newParentIds = container.metadata.parentIds
      .map((parentIdSet) => {
        if (parentIdSet[constants.internalIdField]) {
          const sourceContainer = this.containers
            .find(c => c.item[constants.internalIdField]
              === parentIdSet[constants.internalIdField]);
          if (sourceContainer) {
            return sourceContainer.getIds();
          }
        }
        return parentIdSet;
      });
    container.replaceParentIds(newParentIds);
  }

  /**
   *
   * @param {ItemContainer} container
   */
  finaliseContainer(container) {
    if (container.metadata.changeType === ItemContainer.changeTypes.delete) {
      this.containers.remove(container);
    } else {
      container.finalise();
    }
  }
}

export default ItemStore;
