import Joi from 'joi';
import { EditCollectionTabular } from '../src/index';

describe('EditCollectionTabular', () => {
  describe('canShowCollecton', () => {
    it('returns false if there is an array object child', () => {
      const schema = Joi.object({
        items: Joi.array().items({
          children: Joi.array().items({
            childId: Joi.string(),
          }),
        }),
      });
      expect(
        EditCollectionTabular.canShowCollection(schema, 'items'),
      ).toBe(false);
    });
    it('returns false if there is an array of string child', () => {
      const schema = Joi.object({
        items: Joi.array().items({
          children: Joi.array().items(Joi.string()),
        }),
      });
      expect(
        EditCollectionTabular.canShowCollection(schema, 'items'),
      ).toBe(false);
    });
    it('returns true if there is a big string', () => {
      const schema = Joi.object({
        items: Joi.array().items({
          childId: Joi.string().max(200),
        }),
      });
      expect(
        EditCollectionTabular.canShowCollection(schema, 'items'),
      ).toBe(true);
    });
    it('returns true if there is a small string', () => {
      const schema = Joi.object({
        items: Joi.array().items({
          childId: Joi.string().max(50),
        }),
      });
      expect(
        EditCollectionTabular.canShowCollection(schema, 'items'),
      ).toBe(true);
    });
    it('returns false if there is an image field', () => {
      const schema = Joi.object({
        items: Joi.array().items({
          img: Joi.string().meta({ image: true }),
        }),
      });
      expect(
        EditCollectionTabular.canShowCollection(schema, 'items'),
      ).toBe(false);
    });
  });
});
