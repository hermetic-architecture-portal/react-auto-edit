import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldNumber = ({
  fieldName, container, max, min, readonly,
}) => <input type="number"
  value={container.getItemFieldValue(fieldName)}
  max={max} min={min} readOnly={readonly}
  onChange={event => container.setItemFieldValue(fieldName, Number(event.target.value))} />;

export default observer(EditFieldNumber);
