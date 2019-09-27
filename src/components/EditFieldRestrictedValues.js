import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import Select from 'react-select';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldStringWithSuggestions = ({
  fieldName, container, readonly,
  suggestedValues, isRequired,
}) => {
  const value = container.getItemFieldValue(fieldName);
  const options = suggestedValues.map(x => ({
    value: x,
    label: x,
  }));
  let selectedOption = options.find(x => x.value === value);
  if (!isRequired) {
    options.unshift({
      value: null,
      label: '',
    });
    if (!value) {
      // eslint-disable-next-line prefer-destructuring
      selectedOption = options[0];
    }
  }
  return <Select
    value={selectedOption}
    isDisabled={readonly}
    isClearable={!isRequired}
    onChange={(x) => {
      if (x) {
        container.setItemFieldValue(fieldName, x.value);
      } else {
        container.setItemFieldValue(fieldName, undefined);
      }
    }}

    options={options}
    classNamePrefix="Ed-react-select"
    className="Ed-react-select-container" />;
};

export default observer(EditFieldStringWithSuggestions);
