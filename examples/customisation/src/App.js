import React from 'react';
import VanillaJoi from 'joi';
import { observer } from 'mobx-react';
import { fkExtension, pkExtension } from 'joi-key-extensions';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import {
  ApiProxy, Controller, EditRoutes, Menu, Loading,
  UIFactory, EditCollection,
} from 'react-auto-edit';
import 'react-auto-edit/static/Edit.css';

const Joi = VanillaJoi
  .extend(fkExtension.number)
  .extend(pkExtension.number);

const schema = Joi.object({
  todos: Joi.array().items({
    id: Joi.number().integer().pk(),
    userId: Joi.number().integer(),
    title: Joi.string().meta({ displayName: true }),
    completed: Joi.boolean(),
  }),
});

// customising ApiProxy to add extra headers on each fetch
class CustomApiProxy extends ApiProxy {
  async fetchJson(url, options) {
    const defaultOptions = {
      headers: {
        'x-app-id': 'CustomisationApp',
      },
    };
    const newOptions = Object.assign(defaultOptions, options || {});
    return super.fetchJson(url, newOptions);
  }
}

const apiProxy = new CustomApiProxy(schema, 'https://jsonplaceholder.typicode.com', {
  pageSize: 10,
  concurrentFetchesLimit: 1,
});

let CustomEditBooleanField = ({ container, fieldName }) => <select
  value={container.getItemFieldValue(fieldName)}
  onChange={event => {
    container.setItemFieldValue(fieldName, event.target.value)
  }}>
  <option value={true}>Yes</option>
  <option value={false}>No</option>
</select>;

// need to use the MobX observer method to make 
// the component reactive
CustomEditBooleanField = observer(CustomEditBooleanField);

class CustomUIFactory extends UIFactory {
  // override createEditCollection to return summary/detail collection view
  // rather than default tabular view
  createEditCollection(options) {
    if (options.collectionSchemaPath === 'todos') {
      return <EditCollection
        controller={options.controller}
        schemaPath={options.collectionSchemaPath}
        parentIds={options.parentIds}
        rootComponent={options.rootComponent}
        />;
    }
    return super.createEditCollection(options);
  }

  // override createEditField to render a custom control
  // for boolean fields
  createEditField(options) {
    if (options.fieldType === 'boolean') {
      // show a custom boolean editor
      return <CustomEditBooleanField
        container={options.container} fieldName={options.fieldName} />;
    }
    return super.createEditField(options);
  }

  // override createEditItem to render a custom edit view
  // for todos
  createEditItem(options) {
    const baseResult = super.createEditItem(options);
    if (options.collectionSchemaPath === 'todos') {
      return <div>
        <h1>My custom heading</h1>
        {baseResult}
      </div>;
    }
    return baseResult;
  }
}

const options = {
  uiFactory: new CustomUIFactory(),
};

const controller = new Controller(schema, apiProxy, options)

const App = () => <Router>
  <React.Fragment>
    <Menu controller={controller} />
    <Switch>
      <EditRoutes basePath="" controller={controller} />
    </Switch>
    <Loading controller={controller} />
    <Route exact={true} path="/" component={() => <Redirect to="/todos" />}/>
  </React.Fragment>
</Router>;

export default App;