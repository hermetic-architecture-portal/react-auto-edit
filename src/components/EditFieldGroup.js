import React from 'react'; // eslint-disable-line no-unused-vars
import ReactTooltip from 'react-tooltip';
import { observer } from 'mobx-react';
import utils from '../utils';
import EditField from './EditField';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {Controller} props.controller
 * @param {string} props.fieldName
 */
const EditFieldGroup = ({
  fieldName, controller, container,
}) => {
  const fieldSchemaDesc = container.getFieldSchemaDesc(fieldName);
  let description;
  if (fieldSchemaDesc.description) {
    description = <div className="Ed-field-info"
      data-tip={fieldSchemaDesc.description}></div>;
  }
  let required;
  if (utils.isRequiredField(fieldSchemaDesc)) {
    required = <div className="Ed-required-field"></div>;
  }
  const hiddenField = (utils.isHiddenField(fieldSchemaDesc) ? 'Ed-field-hidden' : '');
  const errors = container.getValidationErrors(fieldName)
    .map((e, index) => <div key={index}>{e}</div>);
  const errorBlock = !errors.length ? undefined
    : <div className="Ed-validation-errors">
      {errors}
    </div>;

  return <div className={`Ed-field-group ${hiddenField}`}>
    <ReactTooltip />
    <div className="Ed-field-name">
      {utils.getFieldDisplayName(fieldName, fieldSchemaDesc)}
      {description}
    </div>
    <EditField controller={controller}
      container={container}
      fieldName={fieldName} key={fieldName} />
    {required}
    {errorBlock}
  </div>;
};

export default observer(EditFieldGroup);
