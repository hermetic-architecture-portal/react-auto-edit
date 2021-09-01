import Joi from 'joi';
import { utils } from '../src';

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
      const validationResult = Joi.validate({
        modelId: 'ford',
      }, childSchema);
      expect(validationResult.error).toBeFalsy();
    });
  });
});
