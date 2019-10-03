import React from 'react'; // eslint-disable-line no-unused-vars
import ReactTooltip from 'react-tooltip';
import { observer } from 'mobx-react';
// eslint-disable-next-line import/no-cycle
import EditField from './EditField';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {Controller} props.controller
 * @param {string} props.fieldName
 */
const EditFieldGroupTabular = ({
  fieldName, container, controller,
}) => {
  let errorNotice;
  const errors = container.getValidationErrors(fieldName);
  if (errors.length) {
    errorNotice = <React.Fragment>
      <div className="Ed-tabular-field-error"
          data-tip={errors.join('\n')}></div>
      <ReactTooltip />
    </React.Fragment>;
  } else {
    errorNotice = <div className="Ed-tabular-field-no-error" />;
  }
  return <React.Fragment>
    <EditField controller={controller} container={container}
      fieldName={fieldName} key={fieldName} />
    {errorNotice}
  </React.Fragment>;
};

export default observer(EditFieldGroupTabular);
