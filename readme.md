# React Auto Edit

React Auto Edit is a library of components for producing low-code, schema driven editing UIs.  You define the data schema, provide the REST APIs, and React Auto Edit automagically provides the UI.  Validation of data against the schema is included automatically.

It is suitable for use cases where you need a basic CRUD editor UI, e.g. line of business / admininstrative apps.

![alt text](/docs/img/screenshot1.png "Screenshot")

## Quick Start
```shell
npx create-react-app myapp
cd myapp
npm install --save react-auto-edit joi joi-key-extensions react-router-dom
npm start
```

Edit myapp/src/App.js:
```js
import React from 'react';
import VanillaJoi from 'joi';
import { fkExtension, pkExtension } from 'joi-key-extensions';
import { BrowserRouter as Router, Redirect, Route } from 'react-router-dom';
import {
  ApiProxy, Controller, EditRoutes, Menu, Loading,
} from 'react-auto-edit';
import 'react-auto-edit/static/Edit.css';

const Joi = VanillaJoi
  .extend(fkExtension.number)
  .extend(pkExtension.number);

const schema = Joi.object({
  albums: Joi.array().items({
    id: Joi.number().integer().pk(),
    userId: Joi.number().integer(),
    title: Joi.string().meta({ displayName: true }),
  }),
  posts: Joi.array().items({
    id: Joi.number().integer().pk(),
    userId: Joi.number().integer(),
    title: Joi.string().meta({ displayName: true }),
    body: Joi.string().max(5000),
  }),
  comments: Joi.array().items({
    id: Joi.number().integer().pk(),
    postId: Joi.number().integer().fk('posts.[].id'),
    name: Joi.string().meta({ displayName: true }),
    email: Joi.string().email(),
    body: Joi.string().max(5000),
  }),
  todos: Joi.array().items({
    id: Joi.number().integer().pk(),
    userId: Joi.number().integer(),
    title: Joi.string().meta({ displayName: true }),
    completed: Joi.boolean(),
  }),
});

const apiProxy = new ApiProxy(schema, 'https://jsonplaceholder.typicode.com', {
  pageSize: 10,
  concurrentFetchesLimit: 1,
});
const controller = new Controller(schema, apiProxy)

const App = () => <Router>
  <React.Fragment>
    <Menu controller={controller} />
    <EditRoutes basePath="" controller={controller} />
    <Loading controller={controller} />
    <Route exact={true} path="/" component={() => <Redirect to="/posts" />}/>
  </React.Fragment>
</Router>;

export default App;
```

## Conventions

### Schema
React Auto Edit has some expectations of the Joi schema that controls it:
* The root of the schema must be a Joi.object (not a Joi.array)
* Each child object must have one or more fields with the pk() validator applied (e.g. `myfield: Joi.string().pk()`)
* Each child object must have one or more fields with a displayName meta applied (e.g. `myfield: Joi.string().meta({ displayName: true })`)
* Objects as children of objects are not supported.  Arrays of objects as children of objects _are_ supported.
* Supported Joi base types are:
  * Joi.string
  * Joi.number
  * Joi.date
  * Joi.boolean
  * Joi.object
  * Joi.array
* Some Joi attributes that React Auto Edit will respond to are:
  * fk() from [joi-key-extensions](https://www.npmjs.com/package/joi-key-extensions) - a select component will be shown, offering candidate values based on the foreign key reference
  * meta({ displayName: true}) - fields tagged with this attribute are used as the display name fields for an entity
  * meta({ generated: true })
    * used to indicate the field is generated server side (e.g. SQL identity columns, audit fields)
    * tagged field will be rendered as a readonly element
    * when a newly created entity is saved React Auto Edit expects the POST API to return the object with server generated fields supplied.  It will update the client side entity with the server generated fields.
  * label() - field label to display
  * description() - a tooltip will be displayed by the field with the supplied description
  * max() - applied to number and string fields
  * min() - applied to number fields
  * string().uri() - a type='html' input will be used
  * date().utc() and date.format() from the [joi-date](https://www.npmjs.com/package/@hapi/joi-date) extension
    * dates will be converted to and from the supplied format
    * if the format includes a time part, a time picker will be shown as well as the date picker
    * React Auto Edit will try to do something sensible regarding the utc setting (and it might even work).

### Target REST API
React Auto Edit also expects the target REST API to conform to some conventions:
* URLs are formatted like `/<EntityName>/<EntityPK>`
* Child collection URLs are like `/<ParentEntityName>/<ParentEntityPK>/<ChildCollectionFieldName>/<ChildEntityPK>`
* Entity and collection names in the URLs correspond exactly to the names in the Joi schema (e.g. no variation between singular and plural form)
* If there are multiple primary keys for an entity then they are supplied one after another in the same order as they appear in the Joi schema (e.g. `/<EntityName>/<EntityPK1>/<EntityPK2>`)
* For each entity there is a:
  * GET method to get a single entity detail - including all fields
  * GET method to get a summary (optionally paginated, see the options for the ApiProxy class) of a collection of the entity
    * This method is only expected to deliver the primary key and display name fields for the entities.  It can return the full entities but at present React Auto Edit assumes it needs to use the get detail method for this.
    * If ApiProxy is configured with server side pagination, then the API is expected to:
      * Take query string parameters 'page' (page number) and 'pageSize' (size of pages to return)
      * Return an object with the signature `{ totalPages: 1, items: [] }`
    * If ApiProxy is configured with client side pagination, then the API is expected to return an array of entities
    * If ApiProxy is configured with server side filtering, then the API is expected to take a query string parameter 'filter'
  * POST method to add a single entity (the entity primary keys will _not_ be included in the URL)
  * PUT method to update a single entity (the entity primary keys will be included in the URL)
  * DELETE method to delete a single entity, identified by the entity primary keys in the URL

If need be you can work around these conventions by subclassing ApiProxy

## Classes

### ApiProxy
The ApiProxy class is in charge of mapping data requests to REST API calls

* constructor - new ApiProxy(schema, baseApiPath, options)
  * schema - the Joi schema you create to drive React Auto Edit
  * baseApiPath - the base url for the target API e.g. 'https://example.org/api'
  * options
    * options.concurrentFetchesLimit - a number specifying the maxmimum number of concurrent API calls from the client.  Defaults to 100
    * options.pagingMode - controls whether collection API calls should be paginated on the server side or client side. One of ApiProxy.pagingModes.clientSide and ApiProxy.pagingModes.serverSide.  Defaults to ApiProxy.pagingModes.clientSide (i.e. the target REST API is not pagination aware).
    * options.filterMode - controls whether filter/search of collections is handled server or client side.  One of ApiProxy.filterModes.clientSide and ApiProxy.filterModes.serverSide.  Defaults to ApiProxy.filterModes.clientSide (i.e. the target REST API does not know how to filter results).
    * options.pageSize - controls the size of search result pages.  Defaults to 10.

## UIFactory
The UIFactory class creates instances of the React UI components.  If you use the standard React UI components then you don't need to worry about this class.

## Controller
The Controller class is in charge of managing application state

* constructor - new Controller(schema, apiProxy, options)
  * schema - the Joi schema you create to drive React Auto Edit
  * apiProxy - an instance of ApiProxy (or a subclass of ApiProxy)
  * options
    * options.baseClientPath - if you want the client URL routes for React Auto Edit to be mounted somewhere other than root, then specify the path here (e.g. '/editor)
    * options.uiFactory - if you need to render different React components for editing a collection, item or field than standard, you can provide an instance of a UIFactory subclass here.

## Components

### EditRoutes
Returns a set of React Router routes supporting url based navigation to items in the schema tree.  Note that you must wrap this with a React Router "BrowserRouter" component.

Props:
* controller - an instance of the Controller class (or subclass of this)

### Menu
Provides a menu to allow navigation to the top-level fields of the schema.  This assumes you are using the EditRoutes component.  Save and Cancel buttons are included for convenience - if you don't want to use the Menu component you can add them seperately.

Props:
* controller - an instance of the Controller class (or subclass of this)
* title - a string to use as the title for the drop down menu - optional
* titleComponent - a React component instance to use as the title for the drop down menu - optional

### Loading
Displays a loading spinner when API calls are in flight

Props:
* controller - an instance of the Controller class (or subclass of this)

## Components - Advanced
You do not need to explicitly use the following components for simple use cases, as they are encapsulated by EditRoutes and Menu.

### SaveButton
Displays a button to trigger saving pending changes to the target API.  If you use the Menu component you will not need to add a SaveButton.

Props:
* controller - an instance of the Controller class (or subclass of this)

### CancelButton
Displays a button that can trigger discarding pending changes.  If you use the Menu component you will not need to add a CancelButton.

Props:
* controller - an instance of the Controller class (or subclass of this)

### EditCollectionTabular
Displays a tabular (columns and rows) editor for a collection.  Note that this editor is not suitable for all data types - for other collections use EditCollection.

Static Method:
* canShowCollection(schema, collectionSchemaPath)
  * schema - Joi schema for the full object tree
  * collectionSchemaPath - a string identifying the collection in the schema tree to render (e.g. 'enclosures.[].animals')
  * returns true if the collection is suitable for display with this component.

Props:
* controller - an instance of the Controller class (or subclass of this)
* schemaPath - a string identifying the collection in the schema tree to render (e.g. 'enclosures.[].animals')
* parentIds - if the collection is not from a field in the root of the object tree, parentIds is an array of the primary keys of the parent elements that must be traversed to get to this collection.  E.g. for schemaPath 'zoos.[].enclosures.[].animals', parentIds might be `[{ zooId: 3}, { enclosureId: 4 }]`.

### EditCollection
Displays a master/detail editor for a collection.  

Props:
* controller - an instance of the Controller class (or subclass of this)
* schemaPath - a string identifying the collection in the schema tree to render (e.g. 'enclosures.[].animals')
* parentIds - if the collection is not from a field in the root of the object tree, parentIds is an array of the primary keys of the parent elements that must be traversed to get to this collection.  E.g. for schemaPath 'zoos.[].enclosures.[].animals', parentIds might be `[{ zooId: 3}, { enclosureId: 4 }]`.

## Customisation

React Auto Edit is designed to be highly customisable.  The project in `examples/customisation` demonstrates some of the available options.

### CSS
You can override the classes in the supplied CSS file (static/Edit.css), or leave it out of your project altogether.

### UIFactory
If you want to return different React components than standard, subclass UIFactory, override the methods as needed and pass an instance of the subclass in the Controller options argument.  Refer to the `examples/customisation` project for examples of usage.

### ApiProxy
If your target API does not correspond to the conventions expected by ApiProxy you can subclass ApiProxy and pass an instance of the subclass to Controller.

e.g.

```js
import { ApiProxy, Controller} from 'react-auto-edit';
import schema from './schema';
import getAuthToken from './somewhere';

class MyApiProxy extends ApiProxy {
  constructor(schema, baseApiPath, options, getAuthToken) {
    super(schema, baseApiPath, options);
    this.getAuthToken = getAuthToken;
  }

  getPageAndFilterParams(page, filter) {
    let result = super.getPageAndFilterParams(page, filter);
    // say our target API has the page number parameter called 'pageNumber'
    // instead of 'page'
    result = result.filter(p => !p.startsWith('page'));
    result.push(`pageNumber=${page}`);
    return result;
  }

  async fetchJson(url, options) {
    // for this example we need an authentication token to access the API
    const authToken = this.getAuthToken();
    const headers = { Authorization: `Bearer ${token}` };
    const newOptions = Object.assign({ headers }, options);
    return super.fetchJson(newUrl, newOptions);
  }
}

const apiProxy = new MyApiProxy(schema, 'http://localhost:8080', null, getAuthToken);
const controller = new Controller(schema, apiProxy);
```

### Routes
You use the React Router 'Switch' component to seize a route back from React Auto Edit and do whatever you please with it.

e.g.
```js
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
// etc...

const App = () => <Router>
  <React.Fragment>
    <Menu controller={controller} />
    <Switch>
      <Route path="/comments" exact={true}
        component={() => <div>Mine!</div>}
      />
      <EditRoutes basePath="" controller={controller} />
    </Switch>
    <Loading controller={controller} />
  </React.Fragment>
</Router>;
```

## Technologies

React Auto Edit is based on:
* [React](https://reactjs.org/) - to render the components
* [Joi](https://github.com/hapijs/joi) - to define the data schema
* [MobX](https://mobx.js.org/) - for state management
* [React Router](https://reacttraining.com/react-router/web/guides/quick-start) - for routing

The example apps uses https://jsonplaceholder.typicode.com as a sample API, with thanks.
