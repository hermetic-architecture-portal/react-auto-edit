import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import { ApiProxy } from '../src/index';

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

describe('ApiProxy', () => {
  describe('buildUrl', () => {
    it('builds an URL with no ids or parentIds', () => {
      const instance = new ApiProxy(schema, 'http://example.com');
      const result = instance.buildUrl('makes');
      expect(result).toBe('http://example.com/makes');
    });
    it('builds an URL with parentIds but no ids', () => {
      const instance = new ApiProxy(schema, 'http://example.com');
      const result = instance.buildUrl('makes.[].models', null, [{ makeId: 'm1' }]);
      expect(result).toBe('http://example.com/makes/m1/models');
    });
    it('builds an URL with ids but no parentids', () => {
      const instance = new ApiProxy(schema, 'http://example.com');
      const result = instance.buildUrl('makes.[]', { makeId: 'm1' });
      expect(result).toBe('http://example.com/makes/m1');
    });
    it('builds an URL with ids and parentids', () => {
      const instance = new ApiProxy(schema, 'http://example.com');
      const result = instance.buildUrl(
        'makes.[].models.[]', { modelId: 'mod1' }, [{ makeId: 'm1' }],
      );
      expect(result).toBe('http://example.com/makes/m1/models/mod1');
    });
    it('builds an URL with ids and multiple parentids', () => {
      const instance = new ApiProxy(schema, 'http://example.com');
      const result = instance.buildUrl(
        'makes.[].models.[].variants.[]', { variantId: 'v1' },
        [{ makeId: 'm1' }, { modelId: 'mod1' }],
      );
      expect(result).toBe('http://example.com/makes/m1/models/mod1/variants/v1');
    });
  });
  describe('collectionSummaryIncludesFullEntities', () => {
    it('returns the value of options.collectionSummariesIncludesFullEntities', () => {
      let instance = new ApiProxy(schema, 'http://example.com',{
        collectionSummariesIncludesFullEntities: true,
      });
      expect(instance.collectionSummaryIncludesFullEntities('makes')).toBe(true);
      instance = new ApiProxy(schema, 'http://example.com');
      expect(instance.collectionSummaryIncludesFullEntities('makes')).toBe(false);
    });
  });
});
