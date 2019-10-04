import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {string} props.fieldName
 * @param {number} props.max
 * @param {number} props.min
 * @param {boolean} props.readonly
 */
const EditFieldNumber = ({
  fieldName, container, max, min, readonly,
}) => <input type="number" step="any"
  value={container.getItemFieldValue(fieldName)}
  max={max} min={min} readOnly={readonly}
  onChange={event => container.setItemFieldValue(fieldName, Number(event.target.value))} />;

export default observer(EditFieldNumber);
