const isPkField = fieldSchemaDesc => fieldSchemaDesc.rules
  && fieldSchemaDesc.rules
    .some(r => r.name === 'pk');

const getPrimaryKeyFieldNames = schemaDesc => Object
  .getOwnPropertyNames(schemaDesc.keys)
  .filter(fieldName => isPkField(schemaDesc.keys[fieldName]));

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
  .map(r => r.args.path)[0];

const nextPath = chunks => chunks
  .filter((item, index) => index > 0)
  .join('.');

const reach = (schema, path) => {
  // the underscore Joi methods are now documented
  // so I assume fine to use them
  // built in Joi.reach does not traverse arrays
  const chunks = path.split('.').filter(chunk => !!chunk);
  if (!chunks.length) {
    return schema;
  }
  const currentChunk = chunks[0];
  if (currentChunk === '[]') {
    if (schema.$_terms.items && schema.$_terms.items.length) {
      return reach(schema.$_terms.items[0], nextPath(chunks));
    }
  } else if (schema.$_terms.keys) {
    const childSchema = schema.$_terms.keys.find(c => c.key === currentChunk);
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
  return rule.args;
};

const getFieldDisplayName = (fieldName, fieldSchemaDesc) => {
  if (fieldSchemaDesc.flags && fieldSchemaDesc.flags.label) {
    return fieldSchemaDesc.flags.label;
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

const isRequiredField = fieldSchemaDesc => fieldSchemaDesc.flags
  && (fieldSchemaDesc.flags.presence === 'required');

const getDisplayNameFieldNames = (schemaDesc) => {
  const result = Object
    .getOwnPropertyNames(schemaDesc.keys)
    .filter(fieldName => schemaDesc.keys[fieldName].metas
      && schemaDesc.keys[fieldName].metas
        .some(meta => meta.displayName));
  if (result.length) {
    return result;
  }
  if (Object
    .getOwnPropertyNames(schemaDesc.keys)
    .includes('name')) {
    return ['name'];
  }
  return getPrimaryKeyFieldNames(schemaDesc);
};

const isGeneratedField = fieldSchemaDesc => fieldSchemaDesc.metas
  && fieldSchemaDesc.metas.some(m => m.generated);

const hasGeneratedField = itemSchemaDesc => Object
  .getOwnPropertyNames(itemSchemaDesc.keys)
  .some(fieldName => isGeneratedField(itemSchemaDesc.keys[fieldName]));

const isHiddenField = fieldSchemaDesc => fieldSchemaDesc.metas
  && fieldSchemaDesc.metas.some(m => m.hidden);

const hasSuggestedValues = fieldSchemaDesc => fieldSchemaDesc.allow
 && fieldSchemaDesc.allow.length;

const getSuggestedValues = fieldSchemaDesc => fieldSchemaDesc.allow;

const suggestedValuesOnly = fieldSchemaDesc => fieldSchemaDesc.flags
  && fieldSchemaDesc.flags.only;

export default {
  reach,
  findRule,
  findRuleArg,
  getFkSchemaDesc,
  isRequiredField,
  isFkField,
  isPkField,
  getFkPath,
  getFkCollectionPath,
  getFkTargetFieldName,
  getPrimaryKeyFieldNames,
  getFieldDisplayName,
  normaliseAlternativesSchema,
  getDisplayNameFieldNames,
  isGeneratedField,
  hasGeneratedField,
  isHiddenField,
  getSuggestedValues,
  suggestedValuesOnly,
  hasSuggestedValues,
};
