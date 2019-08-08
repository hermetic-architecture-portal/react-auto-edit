import { observable, extendObservable } from 'mobx';
import clone from 'clone-deep';
import utils from './utils';
import constants from './constants';

let maxChangeSequence = 1;

class ValidationError {
  constructor(fieldName, message) {
    this.fieldName = fieldName;
    this.message = message;
  }
}

class ForeignKeyMetadata {
  constructor(fkCollectionSchemaPath, fkParentIds, fkTargetFieldName) {
    this.fkCollectionSchemaPath = fkCollectionSchemaPath;
    this.fkParentIds = fkParentIds;
    this.fkTargetFieldName = fkTargetFieldName;
    this.fkItemSchemaPath = `${fkCollectionSchemaPath}.[]`;
  }
}

class ItemContainer {
  constructor(
    collectionSchemaPath, parentIds, schema, itemSchemaDesc,
    item, detailLevel, owner, changeType, getContextData,
  ) {
    this.schema = schema;
    this.getContextData = getContextData;
    this.itemSchemaDesc = itemSchemaDesc;
    this.changeSequence = 0;
    this.metadata = observable({
      collectionSchemaPath,
      parentIds,
      errors: [],
      detailLevel,
      owners: [owner],
      changeType: ItemContainer.changeTypes.none,
    });
    this.item = observable(item);
    this.setDirty(changeType);
  }

  replaceItem(item) {
    Object.getOwnPropertyNames(this.item)
      .forEach((fieldName) => { this.item[fieldName] = item[fieldName]; });
    const newProps = {};
    Object.getOwnPropertyNames(item)
      .filter(newFieldName => !Object.getOwnPropertyNames(this.item).includes(newFieldName))
      .forEach((newFieldName) => { newProps[newFieldName] = item[newFieldName]; });
    extendObservable(this.item, newProps);
  }

  upgradeSummaryToDetail(item) {
    this.metadata.detailLevel = ItemContainer.detailLevel.detail;
    this.replaceItem(item);
  }

  registerOwner(owner) {
    if (!this.metadata.owners.includes(owner)) {
      this.metadata.owners.push(owner);
    }
  }

  deregisterOwner(owner) {
    if (this.metadata.owners.includes(owner)) {
      this.metadata.owners.remove(owner);
    }
  }

  isOrphan() {
    return !this.metadata.owners.length;
  }

  isDirty() {
    return this.metadata.changeType !== ItemContainer.changeTypes.none;
  }

  isNewItem() {
    return this.metadata.changeType === ItemContainer.changeTypes.add;
  }

  setDirty(changeType) {
    if ((changeType !== ItemContainer.changeTypes.none)
      && (this.metadata.changeType === ItemContainer.changeTypes.none)) {
      this.changeSequence = maxChangeSequence;
      maxChangeSequence += 1;
      if (changeType !== ItemContainer.changeTypes.add) {
        this.originalItem = clone(this.item);
      }
    }
    if ((changeType === ItemContainer.changeTypes.edit)
      && (this.metadata.changeType === ItemContainer.changeTypes.add)) {
      return;
    }
    if ((changeType === ItemContainer.changeTypes.delete)
      && (this.metadata.changeType === ItemContainer.changeTypes.add)) {
      this.metadata.changeType = ItemContainer.changeTypes.none;
      return;
    }
    this.metadata.changeType = changeType;
  }

  getCleanItem() {
    const cleanItem = clone(this.item);
    if (cleanItem[constants.newIdField]) {
      delete cleanItem[constants.newIdField];
    }
    return cleanItem;
  }

  validate() {
    const contextData = this.getContextData();
    const itemSchema = utils.reach(this.schema, `${this.metadata.collectionSchemaPath}.[]`);
    const options = {
      abortEarly: false,
      context: {
        schema: this.schema,
        data: contextData,
      },
    };
    const cleanItem = this.getCleanItem();
    const validationResult = itemSchema.validate(cleanItem, options);
    if (this.metadata.errors.length && !validationResult.error) {
      this.metadata.errors.clear();
    } else if (validationResult.error && validationResult.error.details) {
      this.metadata.errors.replace(validationResult.error.details
        .filter(d => d.path && (d.path.length === 1))
        .map(d => new ValidationError(d.path[0], d.message)));
    }
  }

  setItemFieldValue(fieldName, value) {
    this.setDirty(ItemContainer.changeTypes.edit);
    const fieldSchemaDesc = this.getFieldSchemaDesc(fieldName);
    if (value === null) {
      this.item[fieldName] = undefined;
    } else if ((value === '')
      && !(fieldSchemaDesc.valids && fieldSchemaDesc.valids.includes(''))) {
      this.item[fieldName] = undefined;
    } else {
      this.item[fieldName] = value;
    }
    this.validate();
  }

  getItemFieldValue(fieldName) {
    return this.item && this.item[fieldName];
  }

  delete() {
    this.setDirty(ItemContainer.changeTypes.delete);
  }

  revert() {
    if (this.originalItem) {
      this.replaceItem(this.originalItem);
      this.originalItem = null;
      this.metadata.changeType = ItemContainer.changeTypes.none;
      this.metadata.errors.clear();
      this.changeSequence = 0;
    }
  }

  finalise(cleanParentIds, cleanItem) {
    this.replaceItem(cleanItem);
    this.metadata.parentIds.replace(cleanParentIds);
    this.originalItem = null;
    if (this.metadata.changeType === ItemContainer.changeTypes.add) {
      // make sure it doesn't disappear off the collection view screen
      // after being saved
      this.registerOwner(ItemContainer.owner.collectionSearch);
    }
    this.metadata.changeType = ItemContainer.changeTypes.none;
    this.metadata.errors.clear();
    this.changeSequence = 0;
  }

  getValidationErrors(fieldName) {
    return this.metadata.errors
      .filter(e => e.fieldName === fieldName)
      .map(e => e.message);
  }

  getDisplayNameFieldNames() {
    const result = Object
      .getOwnPropertyNames(this.itemSchemaDesc.children)
      .filter(fieldName => this.itemSchemaDesc.children[fieldName].meta
        && this.itemSchemaDesc.children[fieldName].meta
          .some(meta => meta.displayName));
    if (result.length) {
      return result;
    }
    if (Object
      .getOwnPropertyNames(this.itemSchemaDesc.children)
      .includes('name')) {
      return ['name'];
    }
    return utils.getPrimaryKeyFieldNames(this.itemSchemaDesc);
  }

  getDisplayName() {
    return this.getDisplayNameFieldNames()
      .map(fieldName => this.item[fieldName] || '???')
      .join(' - ');
  }

  getKey() {
    if (!this.item) {
      return 'nullItem';
    }
    if (this.item[constants.newIdField]) {
      return this.item[constants.newIdField];
    }
    return utils.getPrimaryKeyFieldNames(this.itemSchemaDesc)
      .map(keyFieldName => this.item[keyFieldName] || 'null')
      .join('-');
  }

  getFieldSchemaDesc(fieldName) {
    return utils.normaliseAlternativesSchema(
      this.itemSchemaDesc.children[fieldName],
    );
  }

  // for a multi-part foreign key get the parent keys
  getFkFieldParentIds(fieldName) {
    // does not currently cope with mulitple parents
    const fieldSchemaDesc = this.getFieldSchemaDesc(fieldName);
    const fkArgs = utils.findRuleArg(fieldSchemaDesc, 'fk');
    const fkParentIds = [];
    if (fkArgs.options && fkArgs.options.parentFieldName) {
      const fkParentValue = this.getItemFieldValue(fkArgs.options.parentFieldName);
      if (!fkParentValue) {
        return null;
      }
      const fkParentFieldSchema = this.itemSchemaDesc.children[fkArgs.options.parentFieldName];
      const fkParentTargetFieldName = utils.getFkTargetFieldName(fkParentFieldSchema);
      const fkParentIdSet = {};
      fkParentIdSet[fkParentTargetFieldName] = fkParentValue;
      fkParentIds.push(fkParentIdSet);
    }
    return fkParentIds;
  }

  getForeignKeyMetadata(fieldName) {
    const fieldSchemaDesc = this.getFieldSchemaDesc(fieldName);
    const fkCollectionSchemaPath = utils.getFkCollectionPath(fieldSchemaDesc);
    const fkParentIds = this.getFkFieldParentIds(fieldName);
    const fkTargetFieldName = utils.getFkTargetFieldName(fieldSchemaDesc);
    return new ForeignKeyMetadata(fkCollectionSchemaPath, fkParentIds, fkTargetFieldName);
  }

  getChildFkFieldNames(fieldName) {
    return Object.getOwnPropertyNames(this.itemSchemaDesc.children)
      .filter((otherFieldName) => {
        if (otherFieldName === fieldName) {
          return false;
        }
        const otherFkArg = utils.findRuleArg(this.itemSchemaDesc.children[otherFieldName], 'fk');
        return (otherFkArg && otherFkArg.options
          && (otherFkArg.options.parentFieldName === fieldName));
      });
  }
}

ItemContainer.detailLevel = {
  summary: 'SUMMARY',
  detail: 'DETAIL',
};

ItemContainer.owner = {
  collectionSearch: 'COLLECTIONSEARCH',
  lookupSearch: 'LOOKUPSEARCH',
  lookupInUse: 'LOOKUPINUSE',
  detail: 'DETAIL',
};

ItemContainer.changeTypes = {
  edit: 'EDIT',
  delete: 'DELETE',
  add: 'ADD',
  none: 'NONE',
};

export default ItemContainer;
