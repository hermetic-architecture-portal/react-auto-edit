import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldArrayOfStrings = ({
  fieldName, container, readonly,
}) => {
  const setValue = (event) => {
    const stringValue = event.target.value || '';
    const newArrayValue = stringValue.split('\n')
      .filter(s => !!s);
    container
      .setItemFieldValue(fieldName, newArrayValue);
  };
  const arrayValue = container.getItemFieldValue(fieldName);
  return <textarea readOnly={readonly}
    value={(arrayValue || []).join('\n')}
    onChange={setValue} />;
};

export default observer(EditFieldArrayOfStrings);
