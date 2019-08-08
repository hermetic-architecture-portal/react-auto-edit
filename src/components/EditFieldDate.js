import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldDate = ({
  fieldName, container, readonly,
}) => {
  const onChange = (event) => {
    let { value } = event.target;
    if (value === '') {
      value = undefined;
    }
    container.setItemFieldValue(fieldName, value);
  };

  return <input type="date" readOnly={readonly}
    value={container.getItemFieldValue(fieldName)}
    onChange={onChange} />;
};

export default observer(EditFieldDate);
