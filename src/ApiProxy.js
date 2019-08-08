import { observable } from 'mobx';
import pLimit from 'p-limit';
import utils from './utils';

class ApiProxy {
  constructor(schema, baseApiPath, concurrentFetchesLimit = 100) {
    this.schema = schema;
    this.baseApiPath = baseApiPath;
    this.inFlightItems = observable([]);
    this.limit = pLimit(concurrentFetchesLimit);
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
          .map(pk => currentParentIds[pk] || 'null')
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
          .map(pk => ids[pk] || 'null')
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
    url = `${url}?page=${page}`;
    if (filter) {
      url = `${url}&filter=${encodeURIComponent(filter)}`;
    }
    return this.fetchJson(url);
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

export default ApiProxy;
