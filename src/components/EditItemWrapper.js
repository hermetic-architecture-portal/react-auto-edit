import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import EditItem from './EditItem';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {object} Props
 * @prop {Controller} Props.controller
 * @prop {string} Props.collectionSchemaPath
 * @prop {array} Props.parentIds
 * @prop {object} Props.ids
 *
 * @extends {React.Component<Props>}
 */
class EditItemWrapper extends React.Component {
  componentDidMount() {
    this.load();
  }

  load() {
    const {
      controller, collectionSchemaPath, parentIds, ids,
    } = this.props;
    const container = controller.findContainer(collectionSchemaPath, parentIds, ids);
    if (container) {
      controller.loadDetail(container);
    }
  }

  render() {
    const {
      controller, collectionSchemaPath, parentIds, ids,
    } = this.props;
    const container = controller.findContainer(collectionSchemaPath, parentIds, ids);
    if (!container) {
      return <div></div>;
    }
    return <EditItem container={container} controller={controller} />;
  }
}

export default observer(EditItemWrapper);
