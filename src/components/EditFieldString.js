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
 * @param {Array<string>} props.suggestedValues
 */
const EditFieldString = ({
  fieldName, container, maxLength, minLength, readonly,
  suggestedValues,
}) => {
  let datalist;
  let datalistId;
  if (suggestedValues && suggestedValues.length) {
    datalistId = `datalist-${fieldName}-${container.getKey()}`;
    datalist = <datalist id={datalistId}>
      {suggestedValues.map(v => <option value={v}/>)}
    </datalist>;
  }
  return <React.Fragment>
    <input
      list={datalistId}
      type="text"
      value={container.getItemFieldValue(fieldName)}
      maxLength={maxLength} minLength={minLength} readOnly={readonly}
      onChange={event => container.setItemFieldValue(fieldName, event.target.value)} />
    {datalist}
  </React.Fragment>;
};

export default observer(EditFieldString);
