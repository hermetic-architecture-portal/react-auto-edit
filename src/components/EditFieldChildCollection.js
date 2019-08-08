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
 */
const EditFieldChildCollection = ({
  fieldName, controller, container,
}) => {
  const itemSchemaPath = `${container.metadata.collectionSchemaPath}.[]`;
  const fieldSchemaPath = `${itemSchemaPath}.${fieldName}`;
  const ids = utils.getIds(container.itemSchemaDesc, container.item);
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
    to={controller.constructLinkUrl(itemSchemaPath, fieldName, container.metadata.parentIds, ids)}>
    Edit
  </Link>;
};

export default observer(EditFieldChildCollection);
