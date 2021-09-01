import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import ReactTooltip from 'react-tooltip';
import { HotKeys } from 'react-hotkeys';
import utils from '../utils';
// eslint-disable-next-line import/no-cycle
import EditCollectionAbstract from './EditCollectionAbstract';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {object} Props
 * @prop {Controller} controller
 *
 * @extends {React.Component<Props>}
 */
class EditCollectionTabular extends EditCollectionAbstract {
  static canShowCollection(schema, collectionSchemaPath) {
    const itemSchemaDesc = utils.reach(schema, `${collectionSchemaPath}.[]`)
      .describe();
    const fieldNames = Object.getOwnPropertyNames(itemSchemaDesc.keys);
    for (let i = 0; i < fieldNames.length; i += 1) {
      const fieldSchemaDesc = itemSchemaDesc.keys[fieldNames[i]];
      if (fieldSchemaDesc.type === 'array') {
        return false;
      }
      if (fieldSchemaDesc.meta && fieldSchemaDesc.meta.some(m => m.image)) {
        return false;
      }
    }
    return true;
  }

  render() {
    const { controller, schemaPath } = this.props;
    const searchResult = this.getSearchResult();
    const itemSchemaDesc = this.getItemSchemaDesc();
    const headings = !searchResult.containers.length ? undefined
      : Object.getOwnPropertyNames(itemSchemaDesc.keys)
        .map((fieldName, index, array) => {
          const fieldSchemaDesc = utils.reach(controller.schema, `${schemaPath}.[].${fieldName}`)
            .describe();
          let description;
          if (fieldSchemaDesc.description) {
            description = <div className="Ed-field-info"
              data-tip={fieldSchemaDesc.description}></div>;
          }
          let required;
          if (utils.isRequiredField(fieldSchemaDesc)) {
            required = <div className="Ed-required-field"/>;
          }
          const hiddenField = (utils.isHiddenField(fieldSchemaDesc) ? 'Ed-field-hidden' : '');
          const fieldDisplayName = utils.getFieldDisplayName(fieldName, fieldSchemaDesc);
          return <th key={fieldName}
            colSpan={(index === array.length - 1) ? 2 : 1}
            className={hiddenField}
            >
            {fieldDisplayName}
            {required}
            {description}
            <ReactTooltip />
          </th>;
        });

    const items = searchResult.containers.map(container => <tr
        key={container.getKey()}>
        {controller.uiFactory.createEditItem({
          controller,
          container,
          collectionSchemaPath: schemaPath,
          wantTabularEditor: true,
        })}
    </tr>);
    return <div className="Ed-single-col-wrapper Ed-collection-tabular">
      <HotKeys keyMap={{ INSERT: 'ctrl+i' }}
        handlers={{ INSERT: this.addItem }}>
        {this.renderNavControls(searchResult)}
        <table className="Ed-tabular-collection">
          <thead>
            <tr>
              {headings}
            </tr>
          </thead>
          <tbody>
            {items}
          </tbody>
        </table>
      </HotKeys>
    </div>;
  }
}

export default observer(EditCollectionTabular);
