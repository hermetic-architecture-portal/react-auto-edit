import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import { HotKeys } from 'react-hotkeys';
import EditCollectionAbstract from './EditCollectionAbstract';

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
    const { parentIds, schemaPath } = this.props;
    const searchResult = this.getSearchResult();
    const { currentItem } = this.status;
    if (currentItem && !searchResult.containers
      .find(c => c.matches(schemaPath, parentIds, currentItem))) {
      this.status.currentItem = null;
    }
    if (!this.status.currentItem) {
      this.updateCurrent();
    }
  }

  render() {
    const { parentIds, controller, schemaPath } = this.props;
    const searchResult = this.getSearchResult();
    const { currentItem } = this.status;
    let currentContainer;
    if (currentItem) {
      currentContainer = searchResult.containers
        .find(c => c.matches(schemaPath, parentIds, currentItem));
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
          <div className={className} onClick={event => this.linkClicked(event, c.item)}
            href={`#${c.getKey()}`} >
            {c.getDisplayName()}
            <div className="Ed-container-link-full-page-edit" onClick={() => this.edit(c)}></div>
          </div>
        </div>
        <div className="Ed-column-button">
          <div className="Ed-button Ed-button-full-page-edit"
            onClick={() => this.edit(c)}>
            Edit
          </div>
        </div>
        <div className="Ed-column-button">
          <div className="Ed-button Ed-button-delete"
            onClick={() => controller.deleteContainer(c)}>
            Delete
          </div>
        </div>
      </div>;
    });
    return <div className="Ed-collection">
      <HotKeys keyMap={{ INSERT: 'ctrl+i' }}
        handlers={{ INSERT: this.addItem }}>
        <div className="Ed-two-col-wrapper">
          <div className="Ed-left-col">
            {this.renderNavControls(searchResult)}
            {items}
          </div>
          <div className="Ed-right-col">
            {controller.uiFactory.createEditItem({
              controller,
              collectionSchemaPath: schemaPath,
              container: currentContainer,
              wantTabularEditor: false,
            })}
          </div>
        </div>
      </HotKeys>
    </div>;
  }
}

export default observer(EditCollection);
