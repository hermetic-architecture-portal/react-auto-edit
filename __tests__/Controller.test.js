import VanillaJoi from 'joi';
import { pkExtension, fkExtension } from 'joi-key-extensions';
import { Controller, ApiProxy, ItemContainer, utils } from '../src/index';

const Joi = VanillaJoi
  .extend(pkExtension.string)
  .extend(pkExtension.number)
  .extend(fkExtension.number);

const schema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string().pk(),
    name: Joi.string(),
    models: Joi.array().items({
      modelId: Joi.string().pk(),
      variants: Joi.array().items({
        variantId: Joi.string().pk(),
      }),
    }),
  }),
});

const schemaWithGenerated = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string().pk().meta({ generated: true }),
    models: Joi.array().items({
      modelId: Joi.string().pk(),
      variants: Joi.array().items({
        variantId: Joi.string().pk(),
      }),
    }),
  }),
});

describe('Controller', () => {
  describe('save', () => {
    it('saves stuff', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      const container = controller.addContainer('makes', []);
      container.setItemFieldValue('makeId', 'ford');
      await controller.save();
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes', {
          method: 'POST',
          body: '{"makeId":"ford"}',
        });
    });
    it('fixes parentIds', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      const parent = controller.addContainer('makes', []);
      const child = controller.addContainer('makes.[].models', [{
        __iid: parent.item.__iid,
      }]);
      parent.setItemFieldValue('makeId', 'ford');
      child.setItemFieldValue('modelId', 'capri');
      await controller.save();
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(2);
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes', {
          method: 'POST',
          body: '{"makeId":"ford"}',
        });
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes/ford/models', {
          method: 'POST',
          body: '{"modelId":"capri"}',
        });
      expect(child.metadata.parentIds[0]).toEqual({
        makeId: 'ford',
        __iid: parent.item.__iid,
      });
    });
    it('updates generated fields', async () => {
      const apiProxy = new ApiProxy(schemaWithGenerated, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      apiProxy.fetchJson.mockReturnValue({ makeId: '0101' });
      const controller = new Controller(schemaWithGenerated, apiProxy);
      const container = controller.addContainer('makes', []);
      const iid = container.item.__iid;
      await controller.save();
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes', {
          method: 'POST',
          body: '{}',
        });
      expect(container.item).toEqual({
        __iid: iid,
        makeId: '0101',
      });
    });
    it('fixes parentIds for generated fields', async () => {
      const apiProxy = new ApiProxy(schemaWithGenerated, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      apiProxy.fetchJson.mockImplementation((url) => {
        if (url === 'http://localhost/makes') {
          return { makeId: '1111' };
        }
        return {};
      });
      const controller = new Controller(schemaWithGenerated, apiProxy);
      const parent = controller.addContainer('makes', []);
      const child = controller.addContainer('makes.[].models', [{
        __iid: parent.item.__iid,
      }]);
      child.setItemFieldValue('modelId', 'capri');
      await controller.save();
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(2);
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes', {
          method: 'POST',
          body: '{}',
        });
      expect(apiProxy.fetchJson)
        .toHaveBeenCalledWith('http://localhost/makes/1111/models', {
          method: 'POST',
          body: '{"modelId":"capri"}',
        });
      expect(parent.item).toEqual({
        makeId: '1111',
        __iid: parent.item.__iid,
      });
      expect(child.metadata.parentIds[0]).toEqual({
        makeId: '1111',
        __iid: parent.item.__iid,
      });
    });
    it('clears the dirty flags', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      const container = controller.addContainer('makes', []);
      container.setItemFieldValue('makeId', 'ford');
      expect(controller.isDirty()).toBeTruthy();
      await controller.save();
      expect(controller.isDirty()).toBeFalsy();
    });
    it('resets original item', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford', name: 'Ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      container.setItemFieldValue('name', 'Fnord');
      expect(container.originalItem).toEqual({
        makeId: 'ford',
        name: 'Ford',
        __iid: container.item.__iid,
      });
      await controller.save();
      expect(container.originalItem).toBeFalsy();
    });
    it('removes deleted items', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford', name: 'Ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      controller.deleteContainer(container);
      await controller.save();
      expect(controller.itemStore.findContainer('makes', [], { makeId: 'ford' })).toBeFalsy();
    });
  });
  describe('cancel', () => {
    it('reverts changed items', async () => {
      const controller = new Controller(schema);
      controller.itemStore.load('makes', [], [{ makeId: 'ford', name: 'Ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      container.setItemFieldValue('name', 'ord');
      await controller.cancel();
      expect(container.getItemFieldValue('name')).toEqual('Ford');
    });
    it('removes added items', async () => {
      const controller = new Controller(schema);
      const container = controller.addContainer('makes', []);
      container.setItemFieldValue('makeId', 'ford');
      let foundContainer = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      expect(foundContainer).toBeTruthy();
      await controller.cancel();
      foundContainer = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      expect(foundContainer).toBeFalsy();
    });
    it('reinstates deleted items', async () => {
      const controller = new Controller(schema);
      controller.itemStore.load('makes', [], [{ makeId: 'ford', name: 'Ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      controller.deleteContainer(container);
      await controller.cancel();
      const foundContainer = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      expect(foundContainer).toBeTruthy();
      expect(foundContainer.metadata.changeType).toEqual(ItemContainer.changeTypes.none);
    });
  });
  describe('constructLinkUrl', () => {
    it('makes a good URL', () => {
      const controller = new Controller(schema);
      controller.itemStore.load('makes', [], [{ makeId: 'ford', name: 'Ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [], { makeId: 'ford' });
      const result = controller.constructLinkUrl(container, 'models');
      expect(result).toBe(`/makes/ford/${container.item.__iid}/models`);
    });
    it('makes a good URL when parent is a new item', () => {
      const controller = new Controller(schema);
      const container = controller.addContainer('makes', []);
      container.setItemFieldValue('makeId', 'tatra');
      const result = controller.constructLinkUrl(container, 'models');
      expect(result).toBe(`/makes/tatra/${container.item.__iid}/models`);
    });
    it('makes a good URL when grandparent is a new item', () => {
      const controller = new Controller(schema);
      const parent = controller.addContainer('makes', []);
      const child = controller.addContainer('makes.[].models', [{ __iid: parent.item.__iid }]);
      parent.setItemFieldValue('makeId', 'tatra');
      child.setItemFieldValue('modelId', '603');
      const result = controller.constructLinkUrl(child, 'variants');
      expect(result).toBe(`/makes/tatra/${parent.item.__iid}/models/603/${child.item.__iid}/variants`);
    });
    it('makes a good URL when grandparent is not loaded', () => {
      const controller = new Controller(schema);
      controller.itemStore.load('makes.[].models', [{ makeId: 'suzuki' }],
        [{ modelId: 'swift' }], ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const child = controller.itemStore.findContainer('makes.[].models', [{ makeId: 'suzuki' }],
        { modelId: 'swift' });
      const result = controller.constructLinkUrl(child, 'variants');
      expect(result).toBe(`/makes/suzuki/undefined/models/swift/${child.item.__iid}/variants`);
    });
  });
  describe('loadDetail', () => {
    it('loads the detail if not already loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      apiProxy.fetchJson.mockReturnValue({ makeId: 'ford', name: 'Ford' });
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford' }],
        ItemContainer.detailLevel.summary, ItemContainer.owner.lookupSearch);
      const container = controller.itemStore.findContainer('makes', [],
        { makeId: 'ford' }, ItemContainer.detailLevel.summary);
      expect(container).toBeTruthy();
      await controller.loadDetail(container);
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/makes/ford');
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);
      expect(container.item.name).toBe('Ford');
    });
    it('doesn\'t load the detail if already loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const container = controller.itemStore.findContainer('makes', [],
        { makeId: 'ford' }, ItemContainer.detailLevel.detail);
      expect(container).toBeTruthy();
      await controller.loadDetail(container);
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(0);
    });
    it('doesn\'t load the detail if summary method returns full entities', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost', {
        collectionSummariesIncludesFullEntities: true,
      });
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford' }],
        ItemContainer.detailLevel.summary, ItemContainer.owner.summary);
      const container = controller.itemStore.findContainer('makes', [],
        { makeId: 'ford' }, ItemContainer.detailLevel.summary);
      expect(container).toBeTruthy();
      await controller.loadDetail(container);
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(0);
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);
    });
    it('loads foreign key lookup value', async () => {
      const fkSchema = Joi.object({
        parents: Joi.array().items({
          parentId: Joi.number().pk(),
          name: Joi.string(),
        }),
        children: Joi.array().items({
          childId: Joi.number().pk(),
          parentId: Joi.number().fk('parents.[].parentId'),
        }),
      });
      const apiProxy = new ApiProxy(fkSchema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(fkSchema, apiProxy);
      controller.itemStore.load('children', [], [{ childId: 1 }],
        ItemContainer.detailLevel.summary, ItemContainer.owner.summary);
      const childContainer = controller.itemStore.findContainer('children', [],
        { childId: 1 }, ItemContainer.detailLevel.summary);
      expect(childContainer).toBeTruthy();
      apiProxy.fetchJson.mockImplementation((url) => {
        if (url === 'http://localhost/parents/2') {
          return { parentId: 2, name: 'PARENT' };
        }
        if (url === 'http://localhost/children/1') {
          return { childId: 1, parentId: 2 };
        }
        throw new Error(`unexpected URL ${url}`);
      });
      await controller.loadDetail(childContainer);
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(2);
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/parents/2');
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/children/1');
      expect(childContainer.item.parentId).toBe(2);
      const parentContainer = controller.itemStore.findContainer('parents', [],
        { parentId: 2 }, ItemContainer.detailLevel.summary);
      expect(parentContainer).toBeTruthy();
    });
    it('loads foreign key lookup value based on alternatives', async () => {
      const fkSchema = Joi.object({
        parents: Joi.array().items({
          parentId: Joi.number().pk(),
          name: Joi.string(),
        }),
        children: Joi.array().items({
          childId: Joi.number().pk(),
          parentId: Joi.number().fk('parents.[].parentId')
            .when('childId', {
              is: 12, then: Joi.any().forbidden(), otherwise: Joi.number().required(),
            }),
        }),
      });
      const apiProxy = new ApiProxy(fkSchema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      const controller = new Controller(fkSchema, apiProxy);
      controller.itemStore.load('children', [], [{ childId: 1 }],
        ItemContainer.detailLevel.summary, ItemContainer.owner.summary);
      const childContainer = controller.itemStore.findContainer('children', [],
        { childId: 1 }, ItemContainer.detailLevel.summary);
      expect(childContainer).toBeTruthy();
      apiProxy.fetchJson.mockImplementation((url) => {
        if (url === 'http://localhost/parents/2') {
          return { parentId: 2, name: 'PARENT' };
        }
        if (url === 'http://localhost/children/1') {
          return { childId: 1, parentId: 2 };
        }
        throw new Error(`unexpected URL ${url}`);
      });
      await controller.loadDetail(childContainer);
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(2);
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/parents/2');
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/children/1');
      expect(childContainer.item.parentId).toBe(2);
      const parentContainer = controller.itemStore.findContainer('parents', [],
        { parentId: 2 }, ItemContainer.detailLevel.summary);
      expect(parentContainer).toBeTruthy();
    });
  });
  describe('loadSearchResult', () => {
    it('loads the children of a parent item when parent is not loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      apiProxy.fetchCollectionSummary.mockReturnValue({
        items: [{ modelId: 'telstar' }],
        totalPages: 2,
      });
      const controller = new Controller(schema, apiProxy);
      await controller.loadSearchResult('makes.[].models', [{ makeId: 'ford' }], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledWith('makes.[].models',
        [{ makeId: 'ford' }], 2, '');
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(2);
      expect(searchResult.containers).toHaveLength(1);
      expect(searchResult.containers[0].item).toMatchObject({ modelId: 'telstar' });
    });
    it('loads the children of a parent item when parent is loaded and not new', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      apiProxy.fetchCollectionSummary.mockReturnValue({
        items: [{ modelId: 'telstar' }],
        totalPages: 2,
      });
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      await controller.loadSearchResult('makes.[].models', [{ makeId: 'ford' }], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledWith('makes.[].models',
        [{ makeId: 'ford' }], 2, '');
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(2);
      expect(searchResult.containers).toHaveLength(1);
      expect(searchResult.containers[0].item).toMatchObject({ modelId: 'telstar' });
    });
    it('does not load the children of a parent item when parent is new', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      const controller = new Controller(schema, apiProxy);
      const parentContainer = controller.addContainer('makes', []);
      await controller.loadSearchResult('makes.[].models', [parentContainer.getIds()], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(0);
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(1);
      expect(searchResult.containers).toHaveLength(0);
    });
  });
  describe('loadDetailById', () => {
    it('loads the detail when not already loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      apiProxy.fetchJson.mockReturnValue({ modelId: 'capri', name: 'Capri' });
      const controller = new Controller(schema, apiProxy);
      await controller.loadDetailByIds('makes.[].models',
        [{ makeId: 'ford' }], { modelId: 'capri' });
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchJson).toHaveBeenCalledWith('http://localhost/makes/ford/models/capri');
      const container = controller.itemStore.findContainer('makes.[].models',
        [{ makeId: 'ford' }], { modelId: 'capri' }, ItemContainer.detailLevel.detail);
      expect(container).toBeTruthy();
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);
    });
    it('does not load the detail when already loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchJson = jest.fn();
      apiProxy.fetchJson.mockReturnValue({ modelId: 'capri', name: 'Capri' });
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes.[].models',
        [{ makeId: 'ford' }], [{ modelId: 'capri' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      await controller.loadDetailByIds('makes.[].models',
        [{ makeId: 'ford' }], { modelId: 'capri' });
      expect(apiProxy.fetchJson).toHaveBeenCalledTimes(0);
    });
  });
  describe('loadSearchResult', () => {
    it('does not lose changes when navigating between pages', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost', {
        collectionSummariesIncludesFullEntities: true,
      });
      apiProxy.fetchCollectionSummary = jest.fn();
      const controller = new Controller(schema, apiProxy);

      // load first page of summary
      apiProxy.fetchCollectionSummary.mockReturnValue({
        totalPages: 2,
        items: [
          { makeId: 'ford', name: 'Ford' },
        ],
      });
      await controller.loadSearchResult('makes', [], 1, '');
      let container = controller.getSearchResult('makes', []).containers[0];
      expect(container).toBeTruthy();
      expect(container.item).toMatchObject({ makeId: 'ford', name: 'Ford' });
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.summary);

      // load detail
      await controller.loadDetail(container);
      expect(container.item).toMatchObject({ makeId: 'ford', name: 'Ford' });
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);

      // make changes
      container.setItemFieldValue('name', 'zzzz');

      // load another page
      apiProxy.fetchCollectionSummary.mockReturnValue({
        totalPages: 2,
        items: [
          { makeId: 'toyota', name: 'Toyota' },
        ],
      });
      await controller.loadSearchResult('makes', [], 2, '');
      // eslint-disable-next-line prefer-destructuring
      container = controller.getSearchResult('makes', []).containers[0];
      await controller.loadDetail(container);
      expect(container.item).toMatchObject({ makeId: 'toyota', name: 'Toyota' });
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);

      // load first page again
      apiProxy.fetchCollectionSummary.mockReturnValue({
        totalPages: 2,
        items: [
          { makeId: 'ford', name: 'Ford' },
        ],
      });
      await controller.loadSearchResult('makes', [], 1, '');
      // eslint-disable-next-line prefer-destructuring
      container = controller.getSearchResult('makes', []).containers[0];

      // load detail
      await controller.loadDetail(container);
      expect(container.item).toMatchObject({ makeId: 'ford', name: 'zzzz' });
      expect(container.metadata.detailLevel).toEqual(ItemContainer.detailLevel.detail);
    });
  });
  describe('constructParentUrl', () => {
    it('returns the collection from an element of a base collection', () => {
      const controller = new Controller(schema, null, {
        baseClientPath: 'http://localhost:9001/test',
      });
      const container = new ItemContainer('makes',
        [],
        schema, null,
        { makeId: 'mg' },
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const result = controller.constructParentUrl(container);
      expect(result).toEqual('http://localhost:9001/test/makes');
    });
    it('returns the parent collection of an element', () => {
      const controller = new Controller(schema, null, {
        baseClientPath: 'http://localhost:9001/test',
      });
      const container = new ItemContainer('makes.[].models',
        [{ makeId: 'mg' }],
        schema, null,
        { modelId: 'bgt' },
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const result = controller.constructParentUrl(container);
      expect(result).toEqual(`http://localhost:9001/test/makes/mg/undefined/models`);
    });
    it('returns the parent collection of an element with grandparents', () => {
      const controller = new Controller(schema, null, {
        baseClientPath: 'http://localhost:9001/test',
      });
      const container = new ItemContainer('makes.[].models.[].variants',
        [{ makeId: 'mg' }, { modelId: 'bgt' }],
        schema, null,
        { variantId: 'mk1' },
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const result = controller.constructParentUrl(container);
      expect(result)
        .toEqual('http://localhost:9001/test/makes/mg/undefined/models/bgt/undefined/variants');
    });
  });
  describe('loadSearchResult', () => {
    it('loads the children of a parent item when parent is not loaded', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      apiProxy.fetchCollectionSummary.mockReturnValue({
        items: [{ modelId: 'telstar' }],
        totalPages: 2,
      });
      const controller = new Controller(schema, apiProxy);
      await controller.loadSearchResult('makes.[].models', [{ makeId: 'ford' }], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledWith('makes.[].models',
        [{ makeId: 'ford' }], 2, '');
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(2);
      expect(searchResult.containers).toHaveLength(1);
      expect(searchResult.containers[0].item).toMatchObject({ modelId: 'telstar' });
    });
    it('loads the children of a parent item when parent is loaded and not new', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      apiProxy.fetchCollectionSummary.mockReturnValue({
        items: [{ modelId: 'telstar' }],
        totalPages: 2,
      });
      const controller = new Controller(schema, apiProxy);
      controller.itemStore.load('makes', [], [{ makeId: 'ford' }],
        ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      await controller.loadSearchResult('makes.[].models', [{ makeId: 'ford' }], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(1);
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledWith('makes.[].models',
        [{ makeId: 'ford' }], 2, '');
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(2);
      expect(searchResult.containers).toHaveLength(1);
      expect(searchResult.containers[0].item).toMatchObject({ modelId: 'telstar' });
    });
    it('does not load the children of a parent item when parent is new', async () => {
      const apiProxy = new ApiProxy(schema, 'http://localhost');
      apiProxy.fetchCollectionSummary = jest.fn();
      const controller = new Controller(schema, apiProxy);
      const parentContainer = controller.addContainer('makes', []);
      await controller.loadSearchResult('makes.[].models', [parentContainer.getIds()], 2, '');
      expect(apiProxy.fetchCollectionSummary).toHaveBeenCalledTimes(0);
      const searchResult = controller.getSearchResult('makes.[].models', [{ makeId: 'ford' }]);
      expect(searchResult.totalPages).toBe(1);
      expect(searchResult.containers).toHaveLength(0);
    });
  });
});
