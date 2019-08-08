import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 */
const loading = ({ controller }) => {
  if (controller.apiProxy.inFlightItems.length > 0) {
    return <div className="Ed-loading"></div>;
  }
  return null;
};

export default observer(loading);
