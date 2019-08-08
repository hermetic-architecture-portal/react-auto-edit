import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 */
const CancelButton = ({ controller }) => {
  let className = 'Ed-button';
  if (!controller.dirty()) {
    className = `${className} disabled`;
  }
  return <div className={className} onClick={() => controller.cancel()}>
    Cancel
  </div>;
};

export default observer(CancelButton);
