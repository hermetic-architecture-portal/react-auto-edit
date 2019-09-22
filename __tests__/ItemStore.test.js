import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import { ItemStore, ItemContainer } from '../src/index';

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

describe('ItemStore', () => {
  describe('fixParentIds', () => {
    it('updates parentIds to match source parent containers', () => {
      const itemStore = new ItemStore(schema);
      const make = itemStore.addContainer('makes', []);
      const model = itemStore.addContainer('makes.[].models', [{ __iid: make.item.__iid }]);
      make.setItemFieldValue('makeId', 'citroen');
      itemStore.fixParentIds(model);
      expect(model.metadata.parentIds).toEqual([{
        __iid: make.item.__iid,
        makeId: 'citroen',
      }]);
    });
  });
  describe('toObject', () => {
    it('resolves the store data into a simple object tree / POJsO', () => {
      const itemStore = new ItemStore(schema);
      itemStore.load('makes', [], [
        { makeId: 'austin' },
        { makeId: 'singer' },
      ], ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      itemStore.load('makes.[].models', [{ makeId: 'singer' }], [
        { modelId: 'vogue' },
        { modelId: 'gazelle' },
      ], ItemContainer.detailLevel.detail, ItemContainer.owner.detail);
      const result = itemStore.toObject();
      expect(result).toEqual({
        makes: [
          { makeId: 'austin' },
          {
            makeId: 'singer',
            models: [
              { modelId: 'vogue' },
              { modelId: 'gazelle' },
            ],
          },
        ],
      });
    });
  });
});
