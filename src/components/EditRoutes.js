import React from 'react'; // eslint-disable-line no-unused-vars
import { Route } from 'react-router-dom';
import { configure } from 'react-hotkeys';
import utils from '../utils';
import constants from '../constants';

const componentConstructor = (params, schemaPath, controller, parentPks) => {
  const parentIds = parentPks.map((parentItemPks) => {
    const result = {};
    parentItemPks.forEach((fieldName, index) => {
      // undefined PKs will end up as the string literal 'undefined'
      // a bit yuk...
      if (params[fieldName] !== 'undefined') {
        result[fieldName] = params[fieldName];
      }
      const iidParam = `${constants.internalIdField}_${index}`;
      if (params[iidParam]) {
        result[constants.internalIdField] = params[iidParam];
      }
    });
    return result;
  });
  const childElement = controller.uiFactory.createEditCollection({
    controller,
    collectionSchemaPath: schemaPath,
    parentIds,
    rootComponent: true,
  });
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
    result.push(<Route key={urlPath}
      path={urlPath} exact={true}
      component={({ match }) => componentConstructor(
        match.params, currentSchemaPath, controller, parentPks,
      )}
    />);
    const nextSchemaPath = currentSchemaPath ? `${currentSchemaPath}.[]` : '[]';
    const nextSchemaDesc = utils.reach(controller.schema, nextSchemaPath).describe();
    const pkFields = utils.getPrimaryKeyFieldNames(nextSchemaDesc);
    const pkFieldsPart = pkFields
      .map(fieldName => `:${fieldName}`)
      .join('/');
    const nextUrlPath = `${urlPath}/${pkFieldsPart}/:${constants.internalIdField}_${parentPks.length}?`;
    const nextParentPks = parentPks.slice();
    nextParentPks.push(pkFields);

    result.push(...buildEditRoutes(nextUrlPath, controller, nextSchemaPath, nextParentPks));
  }
  return result;
};

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
