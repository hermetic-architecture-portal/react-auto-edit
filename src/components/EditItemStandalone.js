import React from 'react'; // eslint-disable-line no-unused-vars
import { withRouter } from 'react-router-dom';
import { observer } from 'mobx-react';

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
class EditItemStandalone extends React.Component {
  componentDidMount() {
    this.load();
    this.delete = this.delete.bind(this);
  }

  getUrl() {
    return window.location.href;
  }

  load() {
    const {
      controller, collectionSchemaPath, parentIds, ids,
    } = this.props;
    controller.loadDetailByIds(collectionSchemaPath, parentIds, ids);
  }

  delete(container) {
    const {
      controller, history,
    } = this.props;
    let parentUrl;
    const currentUrl = new window.URL(this.getUrl());
    if (currentUrl.searchParams.has('return')) {
      // we got here by clicking an in app link, so can go back where we were
      parentUrl = atob(currentUrl.searchParams.get('return'));
    } else {
      // we entered the app directly at this entity, so have to construct
      // a path to the parent element
      parentUrl = controller.constructParentUrl(container);
    }
    controller.deleteContainer(container);
    history.replace(parentUrl);
  }

  render() {
    const {
      controller, collectionSchemaPath, parentIds, ids,
    } = this.props;

    const container = controller.findContainer(collectionSchemaPath, parentIds, ids);
    if (!container) {
      return <div></div>;
    }
    const editItem = controller.uiFactory.createEditItem({
      wantTabularEditor: false,
      container,
      controller,
    });
    return <div className="Ed-single-col-wrapper Ed-standalone-item-wrapper">
      <div className="Ed-button Ed-button-delete"
        onClick={() => this.delete(container)}>
        Delete
      </div>
      {editItem}
    </div>;
  }
}

export default withRouter(observer(EditItemStandalone));
