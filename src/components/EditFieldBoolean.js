import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldBoolean = ({
  fieldName, container, readonly,
}) => <input type="checkbox" readOnly={readonly}
  checked={container.getItemFieldValue(fieldName)}
  onChange={event => container.setItemFieldValue(fieldName, event.target.checked)} />;

export default observer(EditFieldBoolean);
