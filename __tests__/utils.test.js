import VanillaJoi from 'joi';
import { fkExtension, pkExtension } from 'joi-key-extensions';
import { utils } from '../src';

const Joi = VanillaJoi
  .extend(fkExtension.string)
  .extend(pkExtension.string);

const schema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string(),
    models: Joi.array().items({
      modelId: Joi.string(),
    }),
  }),
});

describe('utils', () => {
  describe('reach', () => {
    it('can reach a child schema', () => {
      const childSchema = utils.reach(schema, 'makes.[].models.[]');
      const validationResult = childSchema.validate({
        modelId: 'ford',
      });
      expect(validationResult.error).toBeFalsy();
    });
  });
  describe('hasGeneratedField', () => {
    it('returns true when there is a generated field', () => {
      const testSchema = Joi.object({
        gen: Joi.string().meta({ generated: true }),
      });
      expect(utils.hasGeneratedField(testSchema.describe())).toBe(true);
    });
    it('returns false when there is no generated field', () => {
      const testSchema = Joi.object({
        gen: Joi.string().meta({ something: true }),
      });
      expect(utils.hasGeneratedField(testSchema.describe())).toBe(false);
    });
  });
  describe('isPkField', () => {
    it('returns true for a pk field', () => {
      const testSchema = Joi.string().pk();
      expect(utils.isPkField(testSchema.describe())).toBeTruthy();
    });
    it('returns false for a non pk field', () => {
      const testSchema = Joi.string();
      expect(utils.isPkField(testSchema.describe())).toBeFalsy();
    });
  });
  describe('getFkPath', () => {
    it('returns the foreign key path', () => {
      const testSchema = Joi.string().fk('this.that');
      expect(utils.getFkPath(testSchema.describe())).toBe('this.that');
    });
  });
  describe('getSuggestedValues', () => {
    it('gets suggested values for valid', () => {
      const testSchema = Joi.string().valid('Yes', 'No');
      expect(utils.getSuggestedValues(testSchema.describe())).toMatchObject(['Yes', 'No']);
    });
    it('gets suggested values for allow', () => {
      const testSchema = Joi.string().allow('Yes', 'No');
      expect(utils.getSuggestedValues(testSchema.describe())).toMatchObject(['Yes', 'No']);
    });
  });
  describe('suggestedValuesOnly', () => {
    it('returns true for valid', () => {
      const testSchema = Joi.string().valid('Yes', 'No');
      expect(utils.suggestedValuesOnly(testSchema.describe())).toBeTruthy();
    });
    it('returns false for allow', () => {
      const testSchema = Joi.string().allow('Yes', 'No');
      expect(utils.suggestedValuesOnly(testSchema.describe())).toBeFalsy();
    });
  });
});
