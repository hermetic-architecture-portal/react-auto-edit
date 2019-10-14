import React from 'react'; // eslint-disable-line no-unused-vars
import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import Adapter from 'enzyme-adapter-react-16';
import { shallow, configure } from 'enzyme';
import { EditRoutes, ApiProxy, Controller } from '../src/index';

configure({ adapter: new Adapter() });

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

describe('EditRoutes', () => {
  const apiProxy = new ApiProxy(schema, 'http://localhost');
  const controller = new Controller(schema, apiProxy);
  const component = shallow(<EditRoutes
    controller={controller}/>);
  const routes = component.first().children();
  it('produces a route to a root collection', () => {
    expect(routes).toHaveLength(3);
    expect(routes.at(0).prop('path')).toBe('/makes');
    const example = shallow(routes.at(0).prop('component')({
      match: {
        params: {},
      },
    }));
    expect(example.childAt(0).name()).toBe('EditCollection');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes');
    expect(example.childAt(0).prop('parentIds')).toEqual([]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to a child collection', () => {
    expect(routes).toHaveLength(3);
    expect(routes.at(1).prop('path')).toBe('/makes/:makeId/:__iid_0?/models');
    const example = shallow(routes.at(1).prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('EditCollection');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes.[].models');
    expect(example.childAt(0).prop('parentIds')).toEqual([{
      makeId: 'a',
      __iid: 'b',
    }]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to a grandchild collection', () => {
    expect(routes).toHaveLength(3);
    expect(routes.at(2).prop('path'))
      .toBe('/makes/:makeId/:__iid_0?/models/:modelId/:__iid_1?/variants');
    const example = shallow(routes.at(2).prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
          modelId: 'c',
          __iid_1: 'd',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('EditCollectionTabular');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes.[].models.[].variants');
    expect(example.childAt(0).prop('parentIds')).toEqual([
      { makeId: 'a', __iid: 'b' },
      { modelId: 'c', __iid: 'd' },
    ]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
});
