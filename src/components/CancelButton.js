import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 */
const CancelButton = ({ controller }) => {
  let className = 'Ed-button Ed-button-cancel';
  if (!controller.isDirty()) {
    className = `${className} disabled`;
  }
  return <div className={className} onClick={() => controller.cancel()}>
    Cancel
  </div>;
};

export default observer(CancelButton);
