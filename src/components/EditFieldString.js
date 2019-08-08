import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldString = ({
  fieldName, container, maxLength, minLength, readonly,
}) => <input
  type="text"
  value={container.getItemFieldValue(fieldName)}
  maxLength={maxLength} minLength={minLength} readOnly={readonly}
  onChange={event => container.setItemFieldValue(fieldName, event.target.value)} />;

export default observer(EditFieldString);
