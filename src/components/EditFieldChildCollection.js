import React from 'react'; // eslint-disable-line no-unused-vars
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
// eslint-disable-next-line import/no-cycle
import EditCollectionTabular from './EditCollectionTabular';
import utils from '../utils';

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {import('../Controller').default} Controller
 * @param {Object} props
 * @param {ItemContainer} props.container
 * @param {Controller} props.controller
 * @param {string} props.fieldName
 */
const EditFieldChildCollection = ({
  fieldName, controller, container,
}) => {
  const itemSchemaPath = `${container.metadata.collectionSchemaPath}.[]`;
  const fieldSchemaPath = `${itemSchemaPath}.${fieldName}`;
  const ids = container.getIds();
  if (EditCollectionTabular.canShowCollection(
    controller.schema, fieldSchemaPath,
  )) {
    const nextParentIds = (container.metadata.parentIds || []).concat([ids]);
    return <div className="Ed-child-collection-container">
      <EditCollectionTabular
        controller={controller}
        schemaPath={fieldSchemaPath}
        parentIds={nextParentIds} />
    </div>;
  }
  return <Link
    to={controller.constructLinkUrl(container, fieldName)}>
    Edit
  </Link>;
};

export default observer(EditFieldChildCollection);
