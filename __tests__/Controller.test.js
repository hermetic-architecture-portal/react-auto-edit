import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import { Controller, ApiProxy, ItemContainer } from '../src/index';

const Joi = VanillaJoi
  .extend(pkExtension.string);

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
      expect(result).toBe('/makes/ford/models');
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
      expect(result).toBe('/makes/suzuki/models/swift/variants');
    });
  });
});
