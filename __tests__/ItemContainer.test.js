import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import { ItemContainer } from '../src/index';

const Joi = VanillaJoi
  .extend(pkExtension.string);

const schema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string().pk(),
    models: Joi.array().items({
      modelId: Joi.string().pk(),
      variants: Joi.array().items({
        variantId: Joi.string().pk(),
      }),
    }),
  }),
});

describe('ItemContainer', () => {
  describe('idsMatch', () => {
    it('matches identical items', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' });
      const candidate = container.item;
      expect(container.matches('makes', [], candidate)).toBeTruthy();
    });
    it('matches if iids match', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' });
      const candidate = { makeId: 'b' };
      candidate.__iid = container.item.__iid;
      expect(container.matches('makes', [], candidate)).toBeTruthy();
    });
    it('matches if iids don\'t match but ids do', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' });
      const candidate = { makeId: 'a' };
      candidate.__iid = 'blah';
      expect(container.matches('makes', [], candidate)).toBeTruthy();
    });
    it('doesn\'t match if iids and ids don\'t match', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' });
      const candidate = { makeId: 'b' };
      candidate.__iid = 'blah';
      expect(container.matches('makes', [], candidate)).toBeFalsy();
    });
    it('doesn\'t match if schema path is different', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' });
      const candidate = container.item;
      expect(container.matches('makes.[].models', [], candidate)).toBeFalsy();
    });
    it('doesn\'t match if detail level is supplied and different', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' },
        ItemContainer.detailLevel.summary);
      const candidate = container.item;
      expect(container
        .matches('makes', [], candidate, ItemContainer.detailLevel.detail)).toBeFalsy();
    });
    it('matches if detail level is supplied and same', () => {
      const container = new ItemContainer('makes', [],
        schema, schema.describe().children.makes.items[0], { makeId: 'a' },
        ItemContainer.detailLevel.summary);
      const candidate = container.item;
      expect(container
        .matches('makes', [], candidate, ItemContainer.detailLevel.summary)).toBeTruthy();
    });
    it('matches if parent ids and ids the same', () => {
      const container = new ItemContainer('makes.[].models', [{ makeId: 'a' }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        { modelId: 'x' });
      const candidate = { modelId: 'x' };
      candidate.__iid = 'blah';
      expect(container.matches('makes.[].models', [{ makeId: 'a' }], candidate)).toBeTruthy();
    });
    it('fails if parent ids different and ids the same', () => {
      const container = new ItemContainer('makes.[].models', [{ makeId: 'a' }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        { modelId: 'x' });
      const candidate = { modelId: 'x' };
      candidate.__iid = 'blah';
      expect(container.matches('makes.[].models', [{ makeId: 'b' }], candidate)).toBeFalsy();
    });
    it('matches if parent iids and iids the same', () => {
      const container = new ItemContainer('makes.[].models', [{ __iid: 'e' }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        {});
      const candidate = {};
      candidate.__iid = container.item.__iid;
      expect(container.matches('makes.[].models', [{ __iid: 'e' }], candidate)).toBeTruthy();
    });
    it('fails if parent iids and iids different', () => {
      const container = new ItemContainer('makes.[].models', [{ __iid: 'e' }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        {});
      const candidate = { __iid: 'f' };
      expect(container.matches('makes.[].models', [{ __iid: 'g' }], candidate)).toBeFalsy();
    });
    it('fails if parent iids and iids different, and parent has undef fields', () => {
      const container = new ItemContainer('makes.[].models', [{ __iid: 'e', makeId: undefined }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        {});
      const candidate = { __iid: 'f' };
      expect(container
        .matches('makes.[].models', [{ __iid: 'g', makeId: undefined }], candidate)).toBeFalsy();
    });
  });
  describe('idsMatch', () => {
    it('doesn\'t match if no ids or iids', () => {
      expect(ItemContainer.idsMatch({}, {})).toBeFalsy();
    });
  });
  describe('cleanParentIds', () => {
    it('removes iids', () => {
      const container = new ItemContainer('makes.[].models', [{ __iid: 'e', makeId: 'toyota' }],
        schema,
        schema.describe().children.makes.items[0].children.models.items[0],
        {});
      const result = container.getCleanParentIds();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ makeId: 'toyota' });
    });
  });
});
