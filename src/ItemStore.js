import { observable } from 'mobx';
import uuid from 'uuid/v1';
import clone from 'clone-deep';
import utils from './utils';
import ItemContainer from './ItemContainer';
import constants from './constants';
import DirtyItem from './DirtyItem';

class ItemStore {
  constructor(schema) {
    this.schema = schema;
    this.containers = observable([]);
    this.schemaDescriptions = observable.map({});
    this.toObject = this.toObject.bind(this);
  }

  isDirty() {
    return this.containers.some(container => container.isDirty());
  }

  cancel() {
    const addedItems = this.containers
      .filter(c => c.metadata.changeType === ItemContainer.changeTypes.add);
    addedItems.forEach(c => this.containers.remove(c));
    this.containers.forEach(c => c.revert());
  }

  getItemSchemaDesc(collectionSchemaPath) {
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
    let containers = this.containers.filter((match) => {
      if (match.metadata.collectionSchemaPath !== collectionSchemaPath) {
        return false;
      }
      if ((!match.metadata.parentIds) !== (!parentIds)) {
        return false;
      }
      if (!match.metadata.parentIds.every((parentIdSet, index) => utils
        .allFieldsMatch(parentIdSet, parentIds[index]))) {
        return false;
      }
      return true;
    });
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
    const itemSchemaDesc = this.getItemSchemaDesc(collectionSchemaPath);
    return this.containers.find((match) => {
      if (match.metadata.collectionSchemaPath !== collectionSchemaPath) {
        return false;
      }
      if ((!match.metadata.parentIds) !== (!parentIds)) {
        return false;
      }
      if (detailLevel && (match.metadata.detailLevel !== detailLevel)) {
        return false;
      }
      if (!match.metadata.parentIds.every((parentIdSet, index) => utils
        .allFieldsMatch(parentIdSet, parentIds[index]))) {
        return false;
      }
      return utils.objectsMatch(itemSchemaDesc, match.item, ids);
    });
  }

  registerItemOwner(collectionSchemaPath, parentIds, ids, owner) {
    const container = this.findContainer(collectionSchemaPath, parentIds, ids);
    container.registerOwner(owner);
  }

  addContainer(collectionSchemaPath, parentIds) {
    const item = {};
    item[constants.newIdField] = uuid();
    const container = new ItemContainer(collectionSchemaPath, parentIds,
      this.schema, this.getItemSchemaDesc(collectionSchemaPath), item,
      ItemContainer.detailLevel.detail, ItemContainer.owner.detail,
      ItemContainer.changeTypes.add, this.toObject);
    this.containers.unshift(container);
    return container;
  }

  purge(collectionSchemaPath, parentIds, owner) {
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
    this.purge(collectionSchemaPath, parentIds, owner);
    items.forEach((item) => {
      const existingItem = this.findContainer(collectionSchemaPath, parentIds, item);
      if (!existingItem) {
        this.containers.push(new ItemContainer(
          collectionSchemaPath, parentIds,
          this.schema, this.getItemSchemaDesc(collectionSchemaPath),
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

  static pokeItemIntoPath(item, path, schemaDesc, parentIds, data) {
    const pathChunks = path.split('.').filter(chunk => !!chunk);
    if (pathChunks.length === 0) {
      data.push(item);
      return;
    }
    const currentChunk = pathChunks[0];
    if (currentChunk === '[]') {
      if (parentIds.length) {
        const nextParentIds = parentIds.filter((x, index) => index > 0);
        const nextSchemaDesc = schemaDesc.items[0];
        const nextPath = pathChunks.filter((x, index) => index > 0).join('.');
        const nextData = clone(parentIds[0]);
        data.push(nextData);
        ItemStore.pokeItemIntoPath(item, nextPath, nextSchemaDesc, nextParentIds, nextData);
      } else {
        throw Error('Unexpected path');
      }
    } else {
      const nextPath = pathChunks.filter((x, index) => index > 0).join('.');
      const nextSchemaDesc = schemaDesc.children[currentChunk];
      if (nextSchemaDesc.type === 'array') {
        // eslint-disable-next-line no-param-reassign
        data[currentChunk] = data[currentChunk] || [];
      } else {
        // eslint-disable-next-line no-param-reassign
        data[currentChunk] = data[currentChunk] || {};
      }
      ItemStore.pokeItemIntoPath(item, nextPath, nextSchemaDesc, parentIds, data[currentChunk]);
    }
  }

  toObject() {
    const result = {};
    this.containers.forEach((item) => {
      ItemStore.pokeItemIntoPath(
        item.item, item.metadata.collectionSchemaPath, this.schema.describe(),
        item.metadata.parentIds, result,
      );
    });
    return result;
  }

  validate(collectionSchemaPath, parentIds, ids) {
    const container = this.findContainer(collectionSchemaPath, parentIds, ids);
    container.validate(this.toObject());
  }

  getDirtyItems() {
    const dirtyItems = this.containers
      .filter(c => c.isDirty())
      .sort((a, b) => a.changeSequence - b.changeSequence)
      .map(c => new DirtyItem(
        c.metadata.collectionSchemaPath, c.metadata.parentIds, c.item, c.metadata.changeType,
      ));
    dirtyItems.forEach((di) => {
      const itemSchemaDesc = this.getItemSchemaDesc(di.collectionSchemaPath);
      Object.getOwnPropertyNames(itemSchemaDesc.children)
        .filter(fieldName => utils.isFkField(itemSchemaDesc.children[fieldName]))
    });
    dirtyItems.forEach((di) => {
      // eslint-disable-next-line no-param-reassign
      di.cleanParentIds = di.originalParentIds
        .map((parentIdSet) => {
          if (!parentIdSet[constants.newIdField]) {
            return parentIdSet;
          }
          const parentItemContainer = this.containers
            .find(c => c.item[constants.newIdField] === parentIdSet[constants.newIdField]);
          const cleanParentItem = parentItemContainer.getCleanItem();
          const cleanParentIds = utils.getIds(
            this.getItemSchemaDesc(parentItemContainer.metadata.collectionSchemaPath),
            cleanParentItem,
          );
          return cleanParentIds;
        });
    });
    return dirtyItems;
  }

  /**
   *
   * @param {DirtyItem[]} dirtyItems
   */
  finaliseDirtyItems(dirtyItems) {
    dirtyItems.forEach((di) => {
      const container = this
        .findContainer(di.collectionSchemaPath, di.originalParentIds, di.originalItem);
      if (di.saved) {
        if (di.changeType === ItemContainer.changeTypes.delete) {
          this.containers.remove(container);
        } else {
          let { cleanItem } = di;
          if (di.saveResponse
            && utils.hasGeneratedField(this.getItemSchemaDesc(di.collectionSchemaPath))) {
            cleanItem = di.saveResponse;
          }
          container.finalise(di.cleanParentIds, cleanItem);
        }
      }
    });
  }
}

export default ItemStore;
