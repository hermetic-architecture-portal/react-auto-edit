import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import { GlobalHotKeys } from 'react-hotkeys';

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 */
const SaveButton = ({ controller }) => {
  let className = 'Ed-button Ed-button-save';
  if (!controller.isDirty()) {
    className = `${className} disabled`;
  }
  return <div className={className} onClick={() => controller.save()}>
    <span className="Ed-shortcut-char">S</span>ave
    <GlobalHotKeys keyMap={{ SAVE: 'ctrl+s' }}
      handlers={{ SAVE: (event) => { event.preventDefault(); controller.save(); } }} />
  </div>;
};

export default observer(SaveButton);
