import React from 'react'; // eslint-disable-line no-unused-vars
import { observable } from 'mobx';
import utils from '../utils';
import ItemContainer from '../ItemContainer';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {object} Props
 * @prop {Controller} controller
 *
 * @extends {React.Component<Props>}
 */
class EditCollectionAbstract extends React.Component {
  constructor(props) {
    super(props);
    this.status = observable(this.extractStatus());
    this.filterChanged = this.filterChanged.bind(this);
    this.linkClicked = this.linkClicked.bind(this);
    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.addItem = this.addItem.bind(this);
    this.addItemFullPage = this.addItemFullPage.bind(this);
  }

  getUrl() {
    return window.location.href;
  }

  setUrl(newUrl) {
    window.history.replaceState(null, null, newUrl);
  }

  extractStatus() {
    const result = {
      page: 1,
      filter: '',
    };
    if (this.props.rootComponent) {
      const currentUrl = new window.URL(this.getUrl());
      if (currentUrl.searchParams.has('page')) {
        result.page = Number(currentUrl.searchParams.get('page'));
      }
      if (currentUrl.searchParams.has('filter')) {
        result.filter = currentUrl.searchParams.get('filter');
      }
      const searchParamsObj = {};
      const itemSchemaDesc = this.getItemSchemaDesc();
      currentUrl.searchParams.forEach((value, key) => {
        if (key.startsWith('current_')) {
          searchParamsObj[key.replace('current_', '')] = value;
        }
      });
      const currentIds = ItemContainer.getIdsFromItem(searchParamsObj, itemSchemaDesc);
      if (Object.getOwnPropertyNames(currentIds).length) {
        result.currentItem = currentIds;
      }
    }
    return result;
  }

  encodeStatus() {
    if (this.props.rootComponent) {
      const currentUrl = new window.URL(this.getUrl());
      const newSearchParams = [];
      currentUrl.searchParams.forEach((value, key) => {
        if ((key !== 'filter') && (key !== 'page')
          && !key.startsWith('current_')) {
          newSearchParams.push(`${key}=${encodeURIComponent(value)}`);
        }
      });
      newSearchParams.push(`page=${this.status.page}`);
      newSearchParams.push(`filter=${encodeURIComponent(this.status.filter)}`);
      if (this.status.currentItem) {
        const currentIds = ItemContainer
          .getIdsFromItem(this.status.currentItem, this.getItemSchemaDesc());
        Object.getOwnPropertyNames(currentIds).forEach((fieldName) => {
          newSearchParams.push(`current_${fieldName}=${encodeURIComponent(this.status.currentItem[fieldName])}`);
        });
      }
      const newUrl = `${window.location.pathname}?${newSearchParams.join('&')}`;
      this.setUrl(newUrl);
    }
  }

  filterChanged(event) {
    this.status.filter = event.target.value;
    this.status.page = 1;
    this.encodeStatus();
    this.load();
  }

  getItemSchemaDesc() {
    const { controller, schemaPath } = this.props;
    return utils.reach(controller.schema, `${schemaPath}.[]`).describe();
  }

  async load() {
    const { controller, schemaPath, parentIds } = this.props;
    await controller.loadSearchResult(
      schemaPath, parentIds,
      this.status.page, this.status.filter,
    );
  }

  getSearchResult() {
    const { controller, schemaPath, parentIds } = this.props;
    return controller.getSearchResult(schemaPath, parentIds,
      this.status.page, this.status.filter);
  }

  setCurrentItem(item) {
    this.status.currentItem = ItemContainer.getIdsFromItem(item, this.getItemSchemaDesc());
    this.encodeStatus();
  }

  linkClicked(event, item) {
    event.preventDefault();
    this.setCurrentItem(item);
  }

  componentDidMount() {
    this.load();
  }

  canGoPrev() {
    return this.status.page > 1;
  }

  prev() {
    if (this.canGoPrev()) {
      this.status.page = this.status.page - 1;
      this.encodeStatus();
      this.load();
    }
  }

  edit(container) {
    const nextUrl = this.props.controller.constructLinkUrl(container);
    const currentUrl = new window.URL(this.getUrl());
    const returnToken = btoa(`${currentUrl.pathname}${currentUrl.search}`);
    this.props.history.push(`${nextUrl}?return=${returnToken}`);
  }

  canGoNext() {
    return this.status.page < this.getSearchResult().totalPages;
  }

  next() {
    if (this.canGoNext()) {
      this.status.page = this.status.page + 1;
      this.encodeStatus();
      this.load();
    }
  }

  addItem() {
    const { controller, schemaPath, parentIds } = this.props;
    const newContainer = controller.addContainer(schemaPath, parentIds);
    this.setCurrentItem(newContainer.item);
  }

  addItemFullPage() {
    const { controller, schemaPath, parentIds } = this.props;
    const newContainer = controller.addContainer(schemaPath, parentIds);
    this.edit(newContainer);
  }

  renderNavControls(searchResult) {
    const pageControls = [];
    pageControls.push(<div key="totalpages">{`Page ${this.status.page}/${searchResult.totalPages}`}</div>);
    const prevPageClassName = `Ed-button Ed-button-prev ${this.canGoPrev() ? '' : 'disabled'}`;
    pageControls.push(<div key="prev" className={prevPageClassName} onClick={this.prev}>
      &lt;
    </div>);
    const nextPageClassName = `Ed-button Ed-button-next ${this.canGoNext() ? '' : 'disabled'}`;
    pageControls.push(<div key="next" className={nextPageClassName} onClick={this.next}>
      &gt;
    </div>);
    return <div className="Ed-page-nav-container">
      <div>
        <input type="search" placeholder="Search..."
          value={this.status.filter}
          onChange={this.filterChanged}/>
      </div>
      <div>
        {pageControls}
        <div className="Ed-button Ed-button-new"
          onClick={this.addItem}>
          Add <span className="Ed-shortcut-char">i</span>tem
        </div>
        <div className="Ed-button Ed-button-new-full-page"
          onClick={this.addItemFullPage}>
          Add in new screen
        </div>
      </div>
    </div>;
  }
}


export default EditCollectionAbstract;
