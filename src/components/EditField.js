import React from 'react'; // eslint-disable-line no-unused-vars
import EditFieldString from './EditFieldString';
import EditFieldUri from './EditFieldUri';
import EditFieldBigString from './EditFieldBigString';
import EditFieldFk from './EditFieldFk';
// eslint-disable-next-line import/no-cycle
import EditFieldChildCollection from './EditFieldChildCollection';
import utils from '../utils';
import EditFieldBoolean from './EditFieldBoolean';
import EditFieldNumber from './EditFieldNumber';
import EditFieldArrayOfStrings from './EditFieldArrayOfStrings';
import EditFieldDate from './EditFieldDate';
import constants from '../constants';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {Controller} props.controller
 * @param {ItemContainer} props.container
 */
const EditField = ({
  fieldName, container, controller,
}) => {
  const fieldSchemaDesc = container.getFieldSchemaDesc(fieldName);
  const readonly = utils.isPkField(fieldSchemaDesc) && !container.isNewItem();
  const isRequired = utils.isRequiredField(fieldSchemaDesc);
  const max = utils.findRuleArg(fieldSchemaDesc, 'max');
  const min = utils.findRuleArg(fieldSchemaDesc, 'min');
  let editField;
  if (utils.isFkField(fieldSchemaDesc)) {
    editField = <EditFieldFk readonly={readonly}
      controller={controller} fieldName={fieldName} required={isRequired}
      container={container}
      isRequired={isRequired} />;
  } else if (fieldSchemaDesc.type === 'date') {
    editField = <EditFieldDate readonly={readonly}
      fieldName={fieldName} required={isRequired}
      container={container} />;
  } else if (utils.findRule(fieldSchemaDesc, 'uri')) {
    editField = <EditFieldUri readonly={readonly}
      fieldName={fieldName} required={isRequired}
      container={container}
      maxLength={max}
      minLength={min} />;
  } else if (fieldSchemaDesc.type === 'string') {
    if (max && (max >= constants.bigStringSize)) {
      editField = <EditFieldBigString readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        maxLength={max}
        minLength={min} />;
    } else {
      editField = <EditFieldString readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        maxLength={max}
        minLength={min} />;
    }
  } else if (fieldSchemaDesc.type === 'boolean') {
    editField = <EditFieldBoolean readonly={readonly}
      fieldName={fieldName} required={isRequired}
      container={container} />;
  } else if (fieldSchemaDesc.type === 'number') {
    editField = <EditFieldNumber readonly={readonly}
      fieldName={fieldName} required={isRequired}
      container={container}
      max={max}
      min={min} />;
  } else if (
    (fieldSchemaDesc.type === 'array')
    && fieldSchemaDesc.items && fieldSchemaDesc.items.length
    && (fieldSchemaDesc.items[0].type === 'string')) {
    editField = <EditFieldArrayOfStrings readonly={readonly}
      fieldName={fieldName} required={isRequired}
      container={container} />;
  } else if (
    (fieldSchemaDesc.type === 'array')
    && fieldSchemaDesc.items && fieldSchemaDesc.items.length
    && (fieldSchemaDesc.items[0].type === 'object')) {
    editField = <EditFieldChildCollection
      controller={controller} fieldName={fieldName}
      container={container} />;
  } else {
    console.error('No editor', fieldName, fieldSchemaDesc);
    throw new Error(`No editor available for field ${fieldName}`);
  }

  return editField;
};

export default EditField;
