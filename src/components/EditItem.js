import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import EditFieldGroup from './EditFieldGroup';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {object} Props
 * @prop {Controller} controller
 * @prop {ItemContainer} container
 *
 * @extends {React.Component<Props>}
 */
class EditItem extends React.Component {
  componentDidMount() {
    this.load();
  }

  load() {
    const {
      controller, container,
    } = this.props;
    if (container) {
      controller.loadDetail(container);
    }
  }

  render() {
    const {
      controller, container,
    } = this.props;
    if (!container) {
      return <div></div>;
    }
    const fields = Object.getOwnPropertyNames(container.itemschemaDesc.keys)
      .map(fieldName => <EditFieldGroup
        key={`${fieldName}-${container.getKey()}`}
        container={container}
        fieldName={fieldName}
        controller={controller} />);
    return <div>
      {fields}
    </div>;
  }
}

export default observer(EditItem);
