import clone from 'clone-deep';
import constants from './constants';

class DirtyItem {
  constructor(collectionSchemaPath, parentIds, item, changeType) {
    this.collectionSchemaPath = collectionSchemaPath;
    this.originalParentIds = clone(parentIds);
    this.cleanParentIds = [];
    this.originalItem = clone(item);
    this.cleanItem = clone(item);
    if (this.cleanItem[constants.newIdField]) {
      delete this.cleanItem[constants.newIdField];
    }
    this.changeType = changeType;
    this.saved = false;
  }
}

export default DirtyItem;
