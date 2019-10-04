import { observable } from 'mobx';
import pLimit from 'p-limit';
import utils from './utils';

/**
 * @typedef {Object} Options
 * @property {number} concurrentFetchesLimit - Limits how many concurrent API calls can be made by the client
 * @property {number} pageSize - results page size (where this is under client's control)
 * @property {boolean} collectionSummariesIncludesFullEntities - indicates that the API methods to get collection search results include all the entity fields and we don't need to seperately load detail
 * @property {ApiProxy.pagingModes} pagingMode
 * @property {ApiProxy.filterModes} filterMode
 */

class ApiProxy {
  /**
   * @param {*} schema - the Joi schema
   * @param {*} baseApiPath - the base URL for API calls
   * @param {Options} options
   */
  constructor(schema, baseApiPath, options) {
    const defaults = {
      concurrentFetchesLimit: 100,
      pagingMode: ApiProxy.pagingModes.clientSide,
      filterMode: ApiProxy.filterModes.clientSide,
      collectionSummariesIncludesFullEntities: false,
      pageSize: 10,
    };
    const fullOptions = Object.assign(defaults, options || {});
    this.schema = schema;
    this.baseApiPath = baseApiPath;
    this.pagingMode = fullOptions.pagingMode;
    this.pageSize = fullOptions.pageSize;
    this.collectionSummariesIncludesFullEntities = fullOptions
      .collectionSummariesIncludesFullEntities;
    this.filterMode = fullOptions.filterMode;
    this.inFlightItems = observable([]);
    this.limit = pLimit(fullOptions.concurrentFetchesLimit);
  }

  addInFlightItem(url, options) {
    this.inFlightItems.push(ApiProxy.getInflightItemKey(url, options));
  }

  static getInflightItemKey(url, options) {
    return `${url}${(options && options.method) ? options.method : 'GET'}`;
  }

  removeInFlightItem(url, options) {
    this.inFlightItems.remove(ApiProxy.getInflightItemKey(url, options));
  }

  async innerFetchJson(url, options) {
    this.addInFlightItem(url, options);
    try {
      let response;
      try {
        response = await fetch(url, options);
      } catch (error) {
        console.error(`Error fetching ${url}`, error);
        throw error;
      }
      if (!response.ok) {
        const body = await response.text();
        const error = `${response.status} - ${response.statusText}: ${body}`;
        console.error(`Error fetching ${url}`, error);
        throw new Error(error);
      }
      return response.json();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(`Error fetching ${url}: ${error.message}`);
      throw error;
    } finally {
      this.removeInFlightItem(url, options);
    }
  }

  async fetchJson(url, options) {
    // limit concurrency as the fetch requests can get bogged down otherwise
    return this.limit(() => this.innerFetchJson(url, options));
  }

  static resolveToWordNull(value) {
    if ((typeof value === 'undefined') || (value === null)) {
      return 'null';
    }
    return value;
  }

  buildUrl(schemaPath, ids, parentIds, schemaPathChunks, prevUrlParts, parentSchema) {
    const actualParentSchema = parentSchema || this.schema;
    const actualParentIds = parentIds || [];
    const actualSchemaPathChunks = schemaPathChunks || schemaPath.split('.');
    const urlParts = prevUrlParts || [this.baseApiPath];
    if (!actualSchemaPathChunks.length) {
      return urlParts.join('/');
    }
    const currentChunk = actualSchemaPathChunks[0];
    if (currentChunk === '[]') {
      const itemSchema = utils.reach(actualParentSchema, currentChunk);
      const pkFieldNames = utils.getPrimaryKeyFieldNames(itemSchema.describe());
      if (actualParentIds.length) {
        const currentParentIds = actualParentIds[0];
        const pkUrlParts = pkFieldNames
          .map(pk => ApiProxy.resolveToWordNull(currentParentIds[pk]))
          .map(value => encodeURIComponent(value));
        return this.buildUrl(
          schemaPath,
          ids,
          actualParentIds.filter((item, index) => index > 0),
          actualSchemaPathChunks.filter((item, index) => index > 0),
          urlParts.concat(pkUrlParts),
          itemSchema,
        );
      }
      if (ids) {
        const pkUrlParts = pkFieldNames
          .map(pk => ApiProxy.resolveToWordNull(ids[pk]))
          .map(value => encodeURIComponent(value));
        return this.buildUrl(
          schemaPath,
          ids,
          actualParentIds.filter((item, index) => index > 0),
          actualSchemaPathChunks.filter((item, index) => index > 0),
          urlParts.concat(pkUrlParts),
          itemSchema,
        );
      }
    } else {
      return this.buildUrl(
        schemaPath,
        ids,
        actualParentIds,
        actualSchemaPathChunks.filter((item, index) => index > 0),
        urlParts.concat([currentChunk]),
        utils.reach(actualParentSchema, currentChunk),
      );
    }
    return undefined;
  }

  getPageAndFilterParams(page, filter) {
    const result = [];

    if (this.pagingMode === ApiProxy.pagingModes.serverSide) {
      result.push(`page=${page}`);
      result.push(`pageSize=${this.pageSize}`);
    }

    if (filter && (this.filterMode === ApiProxy.filterModes.serverSide)) {
      result.push(`filter=${encodeURIComponent(filter)}`);
    }
    return result;
  }

  /**
   * @typedef PagedResult
   * @property {number} totalPages
   * @property {Object[]} items
   */
  /**
   * @return {PagedResult}
   */
  async fetchCollectionSummary(collectionSchemaPath, parentIds, page, filter) {
    let url = this.buildUrl(collectionSchemaPath, null, parentIds);
    url = `${url}?${this.getPageAndFilterParams(page, filter).join('&')}`;
    const rawResult = await this.fetchJson(url);
    return this.paginateAndFilterResults(rawResult, collectionSchemaPath, page, filter);
  }

  // eslint-disable-next-line no-unused-vars
  collectionSummaryIncludesFullEntities(collectionSchemaPath) {
    return !!this.collectionSummariesIncludesFullEntities;
  }

  filterResults(itemSchemaDesc, items, filter) {
    if ((this.filterMode === ApiProxy.filterModes.serverSide) || !filter) {
      return items;
    }

    const displayNameFieldNames = utils.getDisplayNameFieldNames(itemSchemaDesc);
    if (!displayNameFieldNames.length) {
      throw new Error('No display field');
    }
    const displayFieldName = displayNameFieldNames[0];
    return items
      .filter(x => (!filter)
        || (x[displayFieldName].toUpperCase().includes(filter.toUpperCase())));
  }


  /**
  * @return {PagedResult}
  */
  paginateResults(itemSchemaDesc, items, rawResult, page) {
    if (this.pagingMode === ApiProxy.pagingModes.serverSide) {
      return {
        items,
        totalPages: this.getTotalPagesFromRawResult(rawResult),
      };
    }
    const displayNameFieldNames = utils.getDisplayNameFieldNames(itemSchemaDesc);
    if (!displayNameFieldNames.length) {
      throw new Error('No display field');
    }
    const displayFieldName = displayNameFieldNames[0];
    const sortedArray = items
      .sort((a, b) => a[displayFieldName].localeCompare(b[displayFieldName]));

    const minIndex = (Number(page) * this.pageSize) - this.pageSize;
    const maxIndex = minIndex + this.pageSize - 1;

    let totalPages = Math.ceil(sortedArray.length / this.pageSize);
    if (totalPages === 0) {
      totalPages = 1;
    }
    return {
      totalPages,
      items: sortedArray.filter((x, index) => (index >= minIndex) && (index <= maxIndex)),
    };
  }

  getTotalPagesFromRawResult(rawResult) {
    return rawResult.totalPages;
  }

  /**
  * @return {Array}
  */
  getItemsFromRawResult(rawResult) {
    return (this.pagingMode === ApiProxy.pagingModes.clientSide)
      ? (rawResult || []) : rawResult.items;
  }

  /**
  * @return {PagedResult}
  */
  paginateAndFilterResults(rawResult, collectionSchemaPath, page, filter) {
    if (!rawResult) {
      return {
        items: [],
        totalPages: 1,
      };
    }
    if ((this.filterMode === ApiProxy.filterModes.clientSide)
      && (this.pagingMode === ApiProxy.pagingModes.serverSide)) {
      throw new Error('Client side filtering of server side paged results is not supported');
    }
    let items = this.getItemsFromRawResult(rawResult);

    const itemSchemaDesc = utils.reach(this.schema, `${collectionSchemaPath}.[]`)
      .describe();

    items = this.filterResults(itemSchemaDesc, items, filter);

    return this.paginateResults(itemSchemaDesc, items, rawResult, page);
  }

  /**
   * @return {Object}
   */
  async fetchItemDetail(itemSchemaPath, parentIds, ids) {
    const url = this.buildUrl(itemSchemaPath, ids, parentIds);
    return this.fetchJson(url);
  }

  /**
   * @return {Object}
   */
  async fetchItemSummary(itemSchemaPath, parentIds, ids) {
    // we don't implement this seperately, but you could have
    // a method that doesn't return all details for an item
    return this.fetchItemDetail(itemSchemaPath, parentIds, ids);
  }

  async putItem(itemSchemaPath, parentIds, item) {
    const url = this.buildUrl(itemSchemaPath, item, parentIds);
    const options = {
      method: 'PUT',
      body: JSON.stringify(item),
    };
    return this.fetchJson(url, options);
  }

  async postItem(collectionSchemaPath, parentIds, item) {
    const url = this.buildUrl(collectionSchemaPath, item, parentIds);
    const options = {
      method: 'POST',
      body: JSON.stringify(item),
    };
    return this.fetchJson(url, options);
  }

  async deleteItem(itemSchemaPath, parentIds, item) {
    const url = this.buildUrl(itemSchemaPath, item, parentIds);
    const options = {
      method: 'DELETE',
    };
    return this.fetchJson(url, options);
  }
}

/**
 * @enum {string}
 */
ApiProxy.filterModes = {
  clientSide: 'clientSide',
  serverSide: 'serverSide',
};

/**
 * @enum {string}
 */
ApiProxy.pagingModes = {
  clientSide: 'clientSide',
  serverSide: 'serverSide',
};

export default ApiProxy;
