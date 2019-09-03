import constants from './constants';

const isPkField = fieldSchemaDesc => fieldSchemaDesc.rules
  && fieldSchemaDesc.rules
    .some(r => r.name === 'pk');

const getPrimaryKeyFieldNames = schemaDesc => Object
  .getOwnPropertyNames(schemaDesc.children)
  .filter(fieldName => isPkField(schemaDesc.children[fieldName]));

const normaliseAlternativesSchema = (fieldSchemaDesc) => {
  if ((fieldSchemaDesc.type === 'alternatives') && fieldSchemaDesc.base) {
    return fieldSchemaDesc.base;
  }
  return fieldSchemaDesc;
};

const isFkField = fieldSchemaDesc => fieldSchemaDesc.rules
  && fieldSchemaDesc.rules.some(r => r.name === 'fk');

const getFkPath = fieldSchemaDesc => fieldSchemaDesc
  .rules
  .filter(r => r.name === 'fk')
  .map(r => r.arg.path)[0];

const nextPath = chunks => chunks
  .filter((item, index) => index > 0)
  .join('.');

const reach = (schema, path) => {
  // have to access Joi internals to traverse the object tree
  // as built in Joi.reach does not traverse arrays
  const chunks = path.split('.').filter(chunk => !!chunk);
  if (!chunks.length) {
    return schema;
  }
  const currentChunk = chunks[0];
  if (currentChunk === '[]') {
    if (schema._inner.items && schema._inner.items.length) {
      return reach(schema._inner.items[0], nextPath(chunks));
    }
  } else if (schema._inner.children) {
    const childSchema = schema._inner.children.find(c => c.key === currentChunk);
    if (childSchema) {
      return reach(childSchema.schema, nextPath(chunks));
    }
  }
  throw new Error(`Could not reach ${path}`);
};

const getFkSchemaDesc = (fieldSchemaDesc, fullSchema) => {
  const fkPath = getFkPath(fieldSchemaDesc);
  const chunks = fkPath.split('.').filter(chunk => !!chunk)
    .filter((item, index, array) => index < array.length - 1);
  const fkSchema = reach(fullSchema, chunks.join('.'));
  return fkSchema.describe();
};

const findRule = (schemaDesc, ruleName) => {
  if (!schemaDesc.rules) {
    return undefined;
  }
  return schemaDesc.rules.find(r => r.name === ruleName);
};

const findRuleArg = (schemaDesc, ruleName) => {
  const rule = findRule(schemaDesc, ruleName);
  if (!rule) {
    return undefined;
  }
  return rule.arg;
};

const getFieldDisplayName = (fieldName, fieldSchemaDesc) => {
  if (fieldSchemaDesc.label) {
    return fieldSchemaDesc.label;
  }
  return fieldName
    // insert a space before all caps
    .replace(/([A-Z])/g, ' $1')
    // uppercase the first character
    .replace(/^./, str => str.toUpperCase());
};

const getFkCollectionPath = (fieldSchemaDesc) => {
  const fkPath = getFkPath(fieldSchemaDesc);
  const chunks = fkPath.split('.').filter(chunk => !!chunk)
    .filter((item, index, array) => index < array.length - 2);
  return chunks.join('.');
};

const getFkTargetFieldName = (fieldSchemaDesc) => {
  const fkPath = getFkPath(fieldSchemaDesc);
  const chunks = fkPath.split('.').filter(chunk => !!chunk);
  return chunks[chunks.length - 1];
};

const allFieldsMatch = (a, b) => Object.getOwnPropertyNames(a)
  .every(fieldName => a[fieldName] === b[fieldName])
  && Object.getOwnPropertyNames(b)
    .every(fieldName => a[fieldName] === b[fieldName]);

const isRequiredField = fieldSchemaDesc => fieldSchemaDesc.flags
  && (fieldSchemaDesc.flags.presence === 'required');

const getIds = (schemaDesc, item) => {
  const ids = {};
  if (!item) {
    return ids;
  }
  if (item[constants.newIdField]) {
    ids[constants.newIdField] = item[constants.newIdField];
  } else {
    getPrimaryKeyFieldNames(schemaDesc)
      .forEach((pkFieldName) => {
        ids[pkFieldName] = item[pkFieldName];
      });
  }
  return ids;
};

const isNewItem = ids => !!ids[constants.newIdField];

const objectsMatch = (schemaDesc, a, b) => {
  if (a[constants.newIdField] && b[constants.newIdField]
    && (a[constants.newIdField] === b[constants.newIdField])) {
    return true;
  }
  if (a[constants.newIdField] || b[constants.newIdField]) {
    return false;
  }
  return getPrimaryKeyFieldNames(schemaDesc)
    .every(pkFieldName => a[pkFieldName] === b[pkFieldName]);
};

const getDisplayNameFieldNames = (schemaDesc) => {
  const result = Object
    .getOwnPropertyNames(schemaDesc.children)
    .filter(fieldName => schemaDesc.children[fieldName].meta
      && schemaDesc.children[fieldName].meta
        .some(meta => meta.displayName));
  if (result.length) {
    return result;
  }
  if (Object
    .getOwnPropertyNames(schemaDesc.children)
    .includes('name')) {
    return ['name'];
  }
  return getPrimaryKeyFieldNames(schemaDesc);
};

const isGeneratedField = fieldSchemaDesc => fieldSchemaDesc.meta
  && fieldSchemaDesc.meta.some(m => m.generated);

const hasGeneratedField = itemSchemaDesc => Object
  .getOwnPropertyNames(itemSchemaDesc.children)
  .some(fieldName => isGeneratedField(itemSchemaDesc.children[fieldName]));

const isHiddenField = fieldSchemaDesc => fieldSchemaDesc.meta
  && fieldSchemaDesc.meta.some(m => m.hidden);

export default {
  reach,
  findRule,
  findRuleArg,
  allFieldsMatch,
  getFkSchemaDesc,
  isRequiredField,
  isFkField,
  isPkField,
  isNewItem,
  getFkPath,
  getIds,
  objectsMatch,
  getFkCollectionPath,
  getFkTargetFieldName,
  getPrimaryKeyFieldNames,
  getFieldDisplayName,
  normaliseAlternativesSchema,
  getDisplayNameFieldNames,
  isGeneratedField,
  hasGeneratedField,
  isHiddenField,
};
