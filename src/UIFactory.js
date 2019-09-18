import React from 'react'; // eslint-disable-line no-unused-vars
import utils from './utils';
import constants from './constants';
import EditFieldString from './components/EditFieldString';
import EditFieldUri from './components/EditFieldUri';
import EditFieldBigString from './components/EditFieldBigString';
import EditFieldFk from './components/EditFieldFk';
import EditFieldChildCollection from './components/EditFieldChildCollection';
import EditFieldBoolean from './components/EditFieldBoolean';
import EditFieldNumber from './components/EditFieldNumber';
import EditFieldArrayOfStrings from './components/EditFieldArrayOfStrings';
import EditFieldDate from './components/EditFieldDate';
import EditFieldImage from './components/EditFieldImage';
import EditItem from './components/EditItem';
import EditItemTabular from './components/EditItemTabular';
import EditCollectionTabular from './components/EditCollectionTabular';
import EditCollection from './components/EditCollection';

/**
 * @typedef {import('./ItemContainer').default} ItemContainer
 */

/**
 * @typedef {import('./Controller').default} Controller
 */

/**
 * @typedef {Object} FieldOptions
 * @property {Controller} controller
 * @property {string} collectionSchemaPath
 * @property {string} fieldName
 * @property {ItemContainer} container
 * @property {string} fieldType - name of the Joi field type (e.g. 'string', 'number')
 * @property {Object} fieldSchemaDesc - Joi field schema description
 * @property {number} min
 * @property {number} max
 * @property {boolean} readonly
 * @property {boolean} isRequired
 */


/**
 * @typedef {Object} ItemOptions
 * @property {Controller} controller
 * @property {string} collectionSchemaPath
 * @property {ItemContainer} container
 * @property {boolean} wantTabularEditor - indicates if a tabular edit format is wanted
 */

/**
 * @typedef {Object} CollectionOptions
 * @property {Controller} controller
 * @property {string} collectionSchemaPath
 * @property {Object} itemSchemaDesc- Joi item schema description
 * @property {array} parentIds
 * @property {boolean} rootComponent - indicates if the component is shown as the root UI component or as a child of an item in a collection
 */

class UIFactory {
  /**
   * @param {FieldOptions} options
   */
  createEditField(options) {
    const {
      // eslint-disable-next-line no-unused-vars
      controller, collectionSchemaPath, fieldName, container, fieldType,
      fieldSchemaDesc, min, max, readonly, isRequired,
    } = options;

    if (utils.isFkField(fieldSchemaDesc)) {
      return <EditFieldFk readonly={readonly}
        controller={controller} fieldName={fieldName} required={isRequired}
        container={container}
        isRequired={isRequired} />;
    }
    if (fieldType === 'date') {
      const formatArg = utils.findRuleArg(fieldSchemaDesc, 'format');
      const format = (formatArg && formatArg.format.length) ? formatArg.format[0] : 'YYYY-MM-DD';
      return <EditFieldDate readonly={readonly}
        fieldName={fieldName} required={isRequired}
        format={format}
        container={container} />;
    }
    if (utils.findRule(fieldSchemaDesc, 'uri')) {
      return <EditFieldUri readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        maxLength={max}
        minLength={min} />;
    }
    if (fieldSchemaDesc.meta && fieldSchemaDesc.meta.find(m => m.image)) {
      return <EditFieldImage readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        maxFileSize={(fieldSchemaDesc.meta.find(m => m.maxFileSize) || constants).maxFileSize}
        />;
    }
    if (fieldType === 'string') {
      if (max && (max >= constants.bigStringSize)) {
        return <EditFieldBigString readonly={readonly}
          fieldName={fieldName} required={isRequired}
          container={container}
          maxLength={max}
          minLength={min} />;
      }
      return <EditFieldString readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        maxLength={max}
        minLength={min} />;
    }
    if (fieldType === 'boolean') {
      return <EditFieldBoolean readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container} />;
    }
    if (fieldType === 'number') {
      return <EditFieldNumber readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container}
        max={max}
        min={min} />;
    }
    if (
      (fieldType === 'array')
      && fieldSchemaDesc.items && fieldSchemaDesc.items.length
      && (fieldSchemaDesc.items[0].type === 'string')) {
      return <EditFieldArrayOfStrings readonly={readonly}
        fieldName={fieldName} required={isRequired}
        container={container} />;
    }
    if (
      (fieldType === 'array')
      && fieldSchemaDesc.items && fieldSchemaDesc.items.length
      && (fieldSchemaDesc.items[0].type === 'object')) {
      return <EditFieldChildCollection
        controller={controller} fieldName={fieldName}
        container={container} />;
    }

    console.warn(`No editor available for field ${fieldName}, type ${fieldType}`);

    return undefined;
  }

  /**
   * @param {ItemOptions} options
   */
  createEditItem(options) {
    if (options.wantTabularEditor) {
      return <EditItemTabular container={options.container} controller={options.controller} />;
    }
    return <EditItem key={options.container ? options.container.getKey() : 'empty'}
      container={options.container} controller={options.controller} />;
  }

  /**
   * @param {CollectionOptions} options
   */
  createEditCollection(options) {
    const {
      controller, collectionSchemaPath, parentIds, rootComponent,
    } = options;
    if (EditCollectionTabular.canShowCollection(controller.schema, collectionSchemaPath)) {
      return <EditCollectionTabular
        controller={controller}
        schemaPath={collectionSchemaPath}
        parentIds={parentIds}
        rootComponent={rootComponent}
        />;
    }
    return <EditCollection
      controller={controller}
      schemaPath={collectionSchemaPath}
      parentIds={parentIds}
      rootComponent={true}
      />;
  }
}

export default UIFactory;
