import React from 'react'; // eslint-disable-line no-unused-vars
import { Link, withRouter } from 'react-router-dom';
import {
  Button, Wrapper,
  Menu as AriaMenu, MenuItem,
} from 'react-aria-menubutton';
import utils from '../utils';
import SaveButton from './SaveButton';
import CancelButton from './CancelButton';

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 * @param {string} title - title of menu, optional
 * @param {*} titleComponent - React component to use for the title element, optional
 * @param {Location} location - the current window.location
 */
const Menu = ({
  controller, title, titleComponent, location,
}) => {
  const actualTitleComponent = titleComponent
    || <React.Fragment>{title || ''}</React.Fragment>;
  const schemaDesc = controller.schema.describe();
  let items;
  let currentFieldDisplayName;
  if (schemaDesc.keys) {
    const currentFieldName = Object.getOwnPropertyNames(schemaDesc.keys)
      .find(fieldName => location.pathname.startsWith(`${controller.baseClientPath}/${fieldName}`));
    currentFieldDisplayName = currentFieldName && utils.getFieldDisplayName(
      currentFieldName, utils.reach(controller.schema, currentFieldName).describe(),
    );
    items = Object.getOwnPropertyNames(schemaDesc.keys)
      .sort((a, b) => a.localeCompare(b))
      .map((fieldName) => {
        const className = (currentFieldName === fieldName)
          ? 'AriaMenuButton-menuItem selected' : 'AriaMenuButton-menuItem';
        const fieldSchemaDesc = utils.reach(controller.schema, fieldName).describe();
        return <MenuItem value={utils.getFieldDisplayName(fieldName, fieldSchemaDesc)}
          key={fieldName}
          className={className}>
          <Link to={`${controller.baseClientPath}/${fieldName}`}>
            <div>{utils.getFieldDisplayName(fieldName, fieldSchemaDesc)}</div>
          </Link>
        </MenuItem>;
      });
  }
  return <div className="Ed-menu">
    <Wrapper className="AriaMenuButton">
      <Button tag="button" className="AriaMenuButton-trigger Ed-menu-button">
        {actualTitleComponent}
      </Button>
      <AriaMenu>
        <ul className="AriaMenuButton-menu Ed-menu-items">
          {items}
        </ul>
      </AriaMenu>
    </Wrapper>
    <div className="Ed-current-field">
      {currentFieldDisplayName}
    </div>
    <div className="Ed-save-cancel-block">
      <SaveButton controller={controller} />
      <CancelButton controller={controller} />
    </div>
  </div>;
};

export default withRouter(Menu);
