import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
// eslint-disable-next-line import/no-cycle
import EditFieldGroupTabular from './EditFieldGroupTabular';
import utils from '../utils';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {object} Props
 * @prop {Controller} controller
 * @prop {ItemContainer} container
 *
 * @extends {React.Component<Props>}
 */
class EditItemTabular extends React.Component {
  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps) {
    const { ids } = this.props;
    if (ids && !prevProps.ids) {
      this.load();
    }
  }

  load() {
    const {
      controller, container,
    } = this.props;
    controller.loadDetail(container);
  }

  isHiddenField(container, fieldName) {
    const fieldSchemaDesc = container.getFieldSchemaDesc(fieldName);
    return (utils.isHiddenField(fieldSchemaDesc) ? 'Ed-field-hidden' : '');
  }

  render() {
    const {
      controller, container,
    } = this.props;

    const { itemSchemaDesc } = container;
    let fields;

    if (!container) {
      fields = Object.getOwnPropertyNames(itemSchemaDesc.children)
        .map(fieldName => <td key={fieldName}
          className={this.isHiddenField(container, fieldName)}></td>);
    } else {
      fields = Object.getOwnPropertyNames(itemSchemaDesc.children)
        .map(fieldName => <td key={fieldName}
          className={this.isHiddenField(container, fieldName)}>
            <EditFieldGroupTabular
              key={`${fieldName}-${container.getKey()}`}
              container={container}
              fieldName={fieldName}
              controller={controller} />
        </td>);
    }

    return <React.Fragment>
      {fields}
      <td className="Ed-tabular-row-controls">
        <div className="Ed-button Ed-button-delete"
          onClick={() => controller.deleteContainer(container)}
        >Delete</div>
      </td>
    </React.Fragment>;
  }
}

export default observer(EditItemTabular);
