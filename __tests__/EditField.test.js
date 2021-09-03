import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import EditField from '../src/components/EditField';

const Joi = VanillaJoi
  .extend(pkExtension.string);

const evaluate = (schema, isNew = false) => {
  const controller = {
    uiFactory: {
      createEditField: options => options,
    },
  };
  const fieldName = '';
  const container = {
    isNewItem: () => isNew,
    getFieldSchemaDesc: () => schema.describe(),
    metadata: {},
  };
  const props = { fieldName, container, controller };
  return EditField(props);
};

describe('EditField', () => {
  it('reports max correctly', () => {
    const schema = Joi.string().max(999);
    expect(evaluate(schema).max).toBe(999);
  });
  it('reports min correctly', () => {
    const schema = Joi.string().min(999);
    expect(evaluate(schema).min).toBe(999);
  });
  describe('isRequired', () => {
    it('reports required correctly', () => {
      const schema = Joi.string().required();
      expect(evaluate(schema).isRequired).toBeTruthy();
    });
    it('reports not required correctly', () => {
      const schema = Joi.string().optional();
      expect(evaluate(schema).isRequired).toBeFalsy();
    });
  });
  describe('readonly', () => {
    it('returns false for new PK field', () => {
      const schema = Joi.string().pk();
      expect(evaluate(schema, true).readonly).toBeFalsy();
    });
    it('returns true for existing PK field', () => {
      const schema = Joi.string().pk();
      expect(evaluate(schema, false).readonly).toBeTruthy();
    });
    it('returns false for ordinary field', () => {
      const schema = Joi.string();
      expect(evaluate(schema).readonly).toBeFalsy();
    });
    it('returns true for generated field', () => {
      const schema = Joi.string().meta({ generated: true });
      expect(evaluate(schema).readonly).toBeTruthy();
    });
  });
});
