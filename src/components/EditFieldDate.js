import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {string} props.fieldName
 * @param {boolean} props.readonly
 * @param {string} props.format
 */
const EditFieldDate = ({
  fieldName, container, readonly, format,
}) => {
  const showTime = format.includes('[T]');
  const isUtc = format.includes('[Z]');
  const currentValue = container.getItemFieldValue(fieldName);

  let currentValueDayJs = dayjs(currentValue);
  if (isUtc) {
    currentValueDayJs = currentValueDayJs.utc();
  }
  const isoShortValue = currentValue ? currentValueDayJs.format('YYYY-MM-DD') : undefined;
  const timePart = currentValue ? currentValueDayJs.format('HH:mm') : undefined;

  const onDateChange = (event) => {
    if (!event.target.value) {
      container.setItemFieldValue(fieldName, undefined);
    } else {
      container.setItemFieldValue(fieldName, dayjs(`${event.target.value} ${timePart}`).format(format));
    }
  };


  const onTimeChange = (event) => {
    if (!event.target.value) {
      container.setItemFieldValue(fieldName, undefined);
    } else {
      container.setItemFieldValue(fieldName, dayjs(`${isoShortValue} ${event.target.value}`).format(format));
    }
  };

  let timeInput;
  if (showTime) {
    timeInput = <input type="time" readOnly={readonly}
    value={timePart}
    onChange={onTimeChange} />;
  }

  return <React.Fragment>
    <input type="date" readOnly={readonly}
      value={isoShortValue}
      onChange={onDateChange} />
    {timeInput}
  </React.Fragment>;
};

export default observer(EditFieldDate);
