import React from 'react'; // eslint-disable-line no-unused-vars
import VanillaJoi from 'joi';
import { pkExtension } from 'joi-key-extensions';
import Adapter from 'enzyme-adapter-react-16';
import { shallow, configure } from 'enzyme';
import { EditRoutes, ApiProxy, Controller } from '../src/index';

configure({ adapter: new Adapter() });

const Joi = VanillaJoi
  .extend(pkExtension.string)
  .extend(pkExtension.number);

const schema = Joi.object({
  makes: Joi.array().items({
    makeId: Joi.string().pk(),
    models: Joi.array().items({
      modelId: Joi.number().pk(),
      variants: Joi.array().items({
        variantId: Joi.string().pk(),
      }),
    }),
  }),
});

const findRouteByPath = (routes, path) => {
  return routes.findWhere(r => r.prop('path') === path);
};

describe('EditRoutes', () => {
  const apiProxy = new ApiProxy(schema, 'http://localhost');
  const controller = new Controller(schema, apiProxy);
  const component = shallow(<EditRoutes
    controller={controller}/>);
  const routes = component.first().children();
  it('produces a route to a root collection', () => {
    const route = findRouteByPath(routes, '/makes');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {},
      },
    }));
    expect(example.childAt(0).name()).toBe('withRouter(EditCollection)');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes');
    expect(example.childAt(0).prop('parentIds')).toEqual([]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to an entity in the root collection', () => {
    const route = findRouteByPath(routes, '/makes/:makeId/:__iid_0?');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('withRouter(EditItemStandalone)');
    expect(example.childAt(0).prop('collectionSchemaPath')).toBe('makes');
    expect(example.childAt(0).prop('parentIds')).toEqual([]);
    expect(example.childAt(0).prop('ids')).toEqual({
      makeId: 'a',
      __iid: 'b',
    });
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to a child collection', () => {
    const route = findRouteByPath(routes, '/makes/:makeId/:__iid_0?/models');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('withRouter(EditCollection)');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes.[].models');
    expect(example.childAt(0).prop('parentIds')).toEqual([{
      makeId: 'a',
      __iid: 'b',
    }]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to an entity in the child collection', () => {
    const route = findRouteByPath(routes, '/makes/:makeId/:__iid_0?/models/:modelId/:__iid_1?');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
          modelId: '2',
          __iid_1: 'd',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('withRouter(EditItemStandalone)');
    expect(example.childAt(0).prop('collectionSchemaPath')).toBe('makes.[].models');
    expect(example.childAt(0).prop('parentIds')).toEqual([{
      makeId: 'a',
      __iid: 'b',
    }]);
    expect(example.childAt(0).prop('ids')).toEqual({
      // note numeric to match schema
      modelId: 2,
      __iid: 'd',
    });
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to a grandchild collection', () => {
    const route = findRouteByPath(routes,
      '/makes/:makeId/:__iid_0?/models/:modelId/:__iid_1?/variants');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
          modelId: '2',
          __iid_1: 'd',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('EditCollectionTabular');
    expect(example.childAt(0).prop('schemaPath')).toBe('makes.[].models.[].variants');
    expect(example.childAt(0).prop('parentIds')).toEqual([
      { makeId: 'a', __iid: 'b' },
      { modelId: 2, __iid: 'd' },
    ]);
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
  it('produces a route to an entity in the  grandchild collection', () => {
    const route = findRouteByPath(routes,
      '/makes/:makeId/:__iid_0?/models/:modelId/:__iid_1?/variants/:variantId/:__iid_2?');
    expect(route).toHaveLength(1);
    const example = shallow(route.prop('component')({
      match: {
        params: {
          makeId: 'a',
          __iid_0: 'b',
          modelId: '2',
          __iid_1: 'd',
          variantId: 'e',
          __iid_2: 'f',
        },
      },
    }));
    expect(example.childAt(0).name()).toBe('withRouter(EditItemStandalone)');
    expect(example.childAt(0).prop('collectionSchemaPath')).toBe('makes.[].models.[].variants');
    expect(example.childAt(0).prop('parentIds')).toEqual([
      { makeId: 'a', __iid: 'b' },
      { modelId: 2, __iid: 'd' },
    ]);
    expect(example.childAt(0).prop('ids')).toEqual({
      variantId: 'e',
      __iid: 'f',
    });
    expect(example.childAt(0).prop('controller')).toBe(controller);
  });
});
