import React from 'react'; // eslint-disable-line no-unused-vars
import { Link } from 'react-router-dom';
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
 */
const Menu = ({ controller }) => {
  const schemaDesc = controller.schema.describe();
  let items;
  if (schemaDesc.children) {
    items = Object.getOwnPropertyNames(schemaDesc.children)
      .sort((a, b) => a.localeCompare(b))
      .map((fieldName) => {
        const fieldSchemaDesc = utils.reach(controller.schema, fieldName).describe();
        return <MenuItem value={utils.getFieldDisplayName(fieldName, fieldSchemaDesc)}
          key={fieldName}
          className="AriaMenuButton-menuItem">
          <Link to={`${controller.baseClientUrl}/${fieldName}`}>
            <div>{utils.getFieldDisplayName(fieldName, fieldSchemaDesc)}</div>
          </Link>
        </MenuItem>;
      });
  }
  return <div className="Ed-menu">
    <Wrapper className="AriaMenuButton">
      <Button tag="button" className="AriaMenuButton-trigger Ed-menu-button">
        Entities
      </Button>
      <AriaMenu>
        <ul className="AriaMenuButton-menu Ed-menu-items">
          {items}
        </ul>
      </AriaMenu>
    </Wrapper>
    <div className="Ed-save-cancel-block">
      <SaveButton controller={controller} />
      <CancelButton controller={controller} />
    </div>
  </div>;
};

export default Menu;
