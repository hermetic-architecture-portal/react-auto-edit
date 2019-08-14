# React Auto Edit

React Auto Edit is a library of components for producing low-code schema driven editing UIs.  You define the data schema, provide the REST APIs, and React Auto Edit automagically provides the UI.

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
import { BrowserRouter as Router, Redirect } from 'react-router-dom';
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
    <Redirect exact from="/" to="/posts" />
  </React.Fragment>
</Router>;

export default App;
```

## Technologies

React Auto Edit is based on:
* [React](https://reactjs.org/) - to render the components
* [Joi](https://github.com/hapijs/joi) - to define the data schema
* [MobX](https://mobx.js.org/) - for state management
* [React Router](https://reacttraining.com/react-router/web/guides/quick-start) - for routing

The example app uses https://jsonplaceholder.typicode.com as a sample API, with thanks.
