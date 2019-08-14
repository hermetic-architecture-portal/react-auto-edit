import React from 'react'; // eslint-disable-line no-unused-vars
import { Route } from 'react-router-dom';
import { configure } from 'react-hotkeys';
import EditCollection from './EditCollection';
import EditCollectionTabular from './EditCollectionTabular';
import utils from '../utils';

const componentConstructor = (params, schemaPath, controller, parentPks) => {
  const parentIds = parentPks.map((parentItemPks) => {
    const result = {};
    parentItemPks.forEach((fieldName) => {
      result[fieldName] = params[fieldName];
    });
    return result;
  });
  let childElement;
  if (EditCollectionTabular.canShowCollection(controller.schema, schemaPath)) {
    childElement = <EditCollectionTabular
      controller={controller}
      schemaPath={schemaPath}
      parentIds={parentIds}
      rootComponent={true}
      />;
  } else {
    childElement = <EditCollection
      controller={controller}
      schemaPath={schemaPath}
      parentIds={parentIds}
      rootComponent={true}
      />;
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
    const nextUrlPath = `${urlPath}/${pkFieldsPart}`;
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
