import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import { HotKeys } from 'react-hotkeys';
import EditItem from './EditItem';
import EditCollectionAbstract from './EditCollectionAbstract';
import utils from '../utils';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {object} Props
 * @prop {Controller} controller
 *
 * @extends {React.Component<Props>}
 */
class EditCollection extends EditCollectionAbstract {
  updateCurrent() {
    const searchResult = this.getSearchResult();
    if (searchResult.containers.length) {
      this.setCurrentItem(searchResult.containers[0].item);
    }
  }

  async load() {
    await super.load();
    const searchResult = this.getSearchResult();
    const itemSchemaDesc = this.getItemSchemaDesc();
    const { currentItem } = this.status;
    if (currentItem && !searchResult.containers
      .find(c => utils.objectsMatch(itemSchemaDesc, c.item, currentItem))) {
      this.status.currentItem = null;
    }
    if (!this.status.currentItem) {
      this.updateCurrent();
    }
  }

  render() {
    const { controller, schemaPath } = this.props;
    const searchResult = this.getSearchResult();
    const itemSchemaDesc = this.getItemSchemaDesc();
    const { currentItem } = this.status;
    let currentContainer;
    if (currentItem) {
      currentContainer = searchResult.containers
        .find(c => utils.objectsMatch(itemSchemaDesc, c.item, currentItem));
    }
    const items = searchResult.containers.map((c) => {
      let className = 'Ed-container-link';
      if (currentContainer === c) {
        className = `${className} Ed-selected-item`;
      }
      if (c.metadata.errors.length) {
        className = `${className} Ed-collection-error-item`;
      }

      return <div
        key={c.getKey()}
        className="Ed-row" >
        <div className="Ed-column">
          <a className={className} onClick={event => this.linkClicked(event, c.item)}
            href={`#${c.getKey()}`} >
            {c.getDisplayName()}
          </a>
        </div>
        <div className="Ed-column-button">
          <div className="Ed-button"
            onClick={() => controller.deleteContainer(c)}>
            Delete
          </div>
        </div>
      </div>;
    });
    return <div>
      <HotKeys keyMap={{ INSERT: 'ctrl+i' }}
        handlers={{ INSERT: this.addItem }}>
        <div className="Ed-two-col-wrapper">
          <div className="Ed-left-col">
            {this.renderNavControls(searchResult)}
            {items}
          </div>
          <div className="Ed-right-col">
            <EditItem schemaPath={`${schemaPath}.[]`}
              key={currentContainer ? currentContainer.getKey() : 'empty'}
              controller={controller}
              container={currentContainer}
            />
          </div>
        </div>
      </HotKeys>
    </div>;
  }
}


export default observer(EditCollection);
