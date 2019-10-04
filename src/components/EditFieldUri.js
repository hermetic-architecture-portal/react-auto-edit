import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {string} props.fieldName
 * @param {number} props.maxLength
 * @param {number} props.minLength
 * @param {boolean} props.readonly
 */
const EditFieldUri = ({
  fieldName, container, maxLength, minLength, readonly,
}) => <input
  type="url"
  value={container.getItemFieldValue(fieldName)}
  maxLength={maxLength} minLength={minLength} readOnly={readonly}
  onChange={event => container.setItemFieldValue(fieldName, event.target.value)} />;

export default observer(EditFieldUri);
