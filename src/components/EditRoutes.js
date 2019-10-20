import React from 'react'; // eslint-disable-line no-unused-vars
import { Route } from 'react-router-dom';
import { configure } from 'react-hotkeys';
import utils from '../utils';
import constants from '../constants';

const castParam = (value, fieldSchemaDesc) => {
  if (fieldSchemaDesc.type === 'number') {
    return Number(value);
  }
  return value;
};

const componentConstructor = (params, schemaPath, controller, parentPks, itemPks) => {
  const parentIds = parentPks.map((parentItemPks, index) => {
    const result = {};
    parentItemPks.forEach((pk) => {
      // undefined PKs will end up as the string literal 'undefined'
      // a bit yuk...
      if (params[pk.fieldName] !== 'undefined') {
        result[pk.fieldName] = castParam(params[pk.fieldName], pk.fieldSchemaDesc);
      }
    });
    const iidParam = `${constants.internalIdField}_${index}`;
    if (params[iidParam]) {
      result[constants.internalIdField] = params[iidParam];
    }
    return result;
  });
  const ids = {};
  if (itemPks) {
    itemPks.forEach((pk) => {
      if (params[pk.fieldName] !== 'undefined') {
        ids[pk.fieldName] = castParam(params[pk.fieldName], pk.fieldSchemaDesc);
      }
    });
    const iidParam = `${constants.internalIdField}_${parentPks.length}`;
    ids[constants.internalIdField] = params[iidParam];
  }
  let childElement;
  if (itemPks) {
    childElement = controller.uiFactory.createEditItemStandalone({
      controller,
      collectionSchemaPath: schemaPath,
      parentIds,
      ids,
    });
  } else {
    childElement = controller.uiFactory.createEditCollection({
      controller,
      collectionSchemaPath: schemaPath,
      parentIds,
      rootComponent: true,
    });
  }
  return <div className="Ed-content">
    {childElement}
  </div>;
};

const buildEditRoutes = (urlPath, controller, schemaPath = '', parentPks = []) => {
  const result = [];
  const schemaDesc = utils.reach(controller.schema, schemaPath).describe();
  if (schemaDesc.type === 'object') {
    Object.getOwnPropertyNames(schemaDesc.children).forEach((fieldName) => {
      const nextUrlPath = `${urlPath}/${encodeURIComponent(fieldName)}`;
      const nextSchemaPath = schemaPath ? `${schemaPath}.${fieldName}` : fieldName;
      result.push(...buildEditRoutes(
        nextUrlPath, controller, nextSchemaPath, parentPks,
      ));
    });
  } else if ((schemaDesc.type === 'array')
    && schemaDesc.items
    && schemaDesc.items.length
    && schemaDesc.items[0].type === 'object') {
    const currentSchemaPath = schemaPath || '';
    // add route to collection
    result.push(<Route key={urlPath}
      path={urlPath} exact={true}
      component={({ match }) => componentConstructor(
        match.params, currentSchemaPath, controller, parentPks,
      )}
    />);
    const nextSchemaPath = currentSchemaPath ? `${currentSchemaPath}.[]` : '[]';
    const nextSchemaDesc = utils.reach(controller.schema, nextSchemaPath).describe();
    const pkFields = utils.getPrimaryKeyFieldNames(nextSchemaDesc)
      .map(fieldName => ({
        fieldName,
        fieldSchemaDesc: nextSchemaDesc.children[fieldName],
      }));
    const pkFieldsPart = pkFields
      .map(pk => `:${pk.fieldName}`)
      .join('/');
    // note - internal ID field is mandatory because otherwise we can't distinguish
    // between an IID and a field name of the entity in the URL
    // e.g. /models/mod1/{3423-2323...} vs /models/mod1/variants
    const nextUrlPath = `${urlPath}/${pkFieldsPart}/:${constants.internalIdField}_${parentPks.length}`;

    // add route to single collection element
    result.push(<Route key={nextUrlPath}
      path={nextUrlPath} exact={true}
      component={({ match }) => componentConstructor(
        match.params, currentSchemaPath, controller, parentPks, pkFields,
      )}
    />);

    const nextParentPks = parentPks.slice();
    nextParentPks.push(pkFields);

    result.push(...buildEditRoutes(nextUrlPath, controller, nextSchemaPath, nextParentPks));
  }
  return result;
};

/**
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {Controller} props.controller
 */
const EditRoutes = ({ controller }) => {
  configure({
    ignoreTags: [],
  });
  const routes = buildEditRoutes(controller.baseClientPath, controller);
  return <React.Fragment>
    {routes}
  </React.Fragment>;
};

export default EditRoutes;
