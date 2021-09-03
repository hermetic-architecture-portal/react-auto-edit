import React from 'react'; // eslint-disable-line no-unused-vars
import utils from '../utils';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {Controller} props.controller
 * @param {ItemContainer} props.container
 * @param {string} props.fieldName
 */
const EditField = ({
  fieldName, container, controller,
}) => {
  const fieldSchemaDesc = container.getFieldSchemaDesc(fieldName);
  const readonly = (utils.isPkField(fieldSchemaDesc) && !container.isNewItem())
    || utils.isGeneratedField(fieldSchemaDesc);
  const isRequired = utils.isRequiredField(fieldSchemaDesc);
  const maxRule = utils.findRuleArg(fieldSchemaDesc, 'max');
  const max = maxRule ? maxRule.limit : undefined;
  const minRule = utils.findRuleArg(fieldSchemaDesc, 'min');
  const min = minRule ? minRule.limit : undefined;
  const options = {
    controller,
    collectionSchemaPath: container.metadata.collectionSchemaPath,
    fieldName,
    container,
    fieldType: fieldSchemaDesc.type,
    fieldSchemaDesc,
    min,
    max,
    readonly,
    isRequired,
  };
  return controller.uiFactory.createEditField(options);
};

export default EditField;
