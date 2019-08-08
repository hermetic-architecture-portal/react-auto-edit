import React from 'react'; // eslint-disable-line no-unused-vars
import { observable } from 'mobx';
import utils from '../utils';

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
  }

  extractStatus() {
    const result = {
      page: 1,
      filter: '',
    };
    if (this.props.rootComponent) {
      const currentUrl = new window.URL(window.location.href);
      if (currentUrl.searchParams.has('page')) {
        result.page = Number(currentUrl.searchParams.get('page'));
      }
      if (currentUrl.searchParams.has('filter')) {
        result.filter = currentUrl.searchParams.get('filter');
      }
      const currentItem = {};
      const itemSchemaDesc = this.getItemSchemaDesc();
      utils.getPrimaryKeyFieldNames(itemSchemaDesc)
        .forEach((fieldName) => {
          const searchParamName = `current_${fieldName}`;
          if (currentUrl.searchParams.has(searchParamName)) {
            let fieldValue = currentUrl.searchParams.get(searchParamName);
            if (itemSchemaDesc.children[fieldName].type === 'number') {
              fieldValue = Number(fieldValue);
            }
            currentItem[fieldName] = fieldValue;
          }
        });
      if (Object.getOwnPropertyNames(currentItem).length) {
        result.currentItem = currentItem;
      }
    }
    return result;
  }

  encodeStatus() {
    if (this.props.rootComponent) {
      const currentUrl = new window.URL(window.location.href);
      const newSearchParams = [];
      const pkFieldSearchParamNames = utils.getPrimaryKeyFieldNames(this.getItemSchemaDesc())
        .map(fieldName => `current_${fieldName}`);
      currentUrl.searchParams.forEach((value, key) => {
        if ((key !== 'filter') && (key !== 'page') && (key !== 'currentItem')
          && !pkFieldSearchParamNames.includes(key)) {
          newSearchParams.push(`${key}=${encodeURIComponent(value)}`);
        }
      });
      newSearchParams.push(`page=${this.status.page}`);
      newSearchParams.push(`filter=${encodeURIComponent(this.status.filter)}`);
      if (this.status.currentItem && !utils.isNewItem(this.status.currentItem)) {
        const ids = utils.getPrimaryKeyFieldNames(this.getItemSchemaDesc())
          .map(fieldName => `current_${fieldName}=${encodeURIComponent(this.status.currentItem[fieldName])}`);
        newSearchParams.push(ids);
      }
      const newUrl = `${window.location.pathname}?${newSearchParams.join('&')}`;
      window.history.replaceState(null, null, newUrl);
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
    this.status.currentItem = utils.getIds(this.getItemSchemaDesc(), item);
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
    return (this.status.page > 1) && !this.props.controller.dirty();
  }

  prev() {
    if (this.canGoPrev()) {
      this.status.page = this.status.page - 1;
      this.encodeStatus();
      this.load();
    }
  }

  canGoNext() {
    return (this.status.page < this.getSearchResult().totalPages)
      && !this.props.controller.dirty();
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

  renderNavControls(searchResult) {
    const pageControls = [];
    pageControls.push(<div key="totalpages">{`Page ${this.status.page}/${searchResult.totalPages}`}</div>);
    const prevPageClassName = this.canGoPrev() ? 'Ed-button' : 'Ed-button disabled';
    pageControls.push(<div key="prev" className={prevPageClassName} onClick={this.prev}>
      &lt;
    </div>);
    const nextPageClassName = this.canGoNext() ? 'Ed-button' : 'Ed-button disabled';
    pageControls.push(<div key="next" className={nextPageClassName} onClick={this.next}>
      &gt;
    </div>);
    return <div className="Ed-page-nav-container">
      <div>
        <input type="search" placeholder="Search..."
          value={this.status.filter}
          onChange={this.filterChanged}/>
      </div>
      {pageControls}
      <div className="Ed-button"
        onClick={this.addItem}>
        Add <span className="Ed-shortcut-char">i</span>tem
      </div>
    </div>;
  }
}


export default EditCollectionAbstract;
