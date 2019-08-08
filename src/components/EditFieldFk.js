import React from 'react'; // eslint-disable-line no-unused-vars
import { observer } from 'mobx-react';
import Select from 'react-select';

/**
 * @typedef {import('../Controller').default} Controller
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @typedef {object} Props
 * @prop {Controller} controller
 * @prop {ItemContainer} container
 *
 * @extends {React.Component<Props>}
 */
class EditFieldFk extends React.Component {
  constructor(props) {
    super(props);
    this.valueChanged = this.valueChanged.bind(this);
    this.filterChanged = this.filterChanged.bind(this);
    this.menuOpen = this.menuOpen.bind(this);
    this.filter = '';
  }

  valueChanged(fkContainer) {
    const {
      fieldName, controller, container,
    } = this.props;
    controller.setLookupItemContainer(container, fieldName, fkContainer);
  }

  async loadOptions(filter) {
    const {
      fieldName, controller, container,
    } = this.props;

    controller.loadFkLookupData(container, fieldName, filter);
  }

  menuOpen() {
    if (!this.filter) {
      this.loadOptions();
    }
  }

  filterChanged(value) {
    if (this.filter !== value) {
      this.filter = value;
      this.loadOptions(value);
    }
  }

  render() {
    const {
      fieldName, controller, container, readonly, isRequired,
    } = this.props;

    const fkMetadata = container.getForeignKeyMetadata(fieldName);

    const lookupData = controller.getLookupData(container, fieldName);
    let lookupValue = controller.getLookupItemContainer(container, fieldName);

    if (!lookupValue) {
      // null, as opposed to undefined is required to clear the select
      lookupValue = null;
    }
    return <Select
      value={lookupValue}
      onChange={this.valueChanged}
      isClearable={!isRequired}
      isDisabled={readonly}
      onInputChange={this.filterChanged}
      onMenuOpen={this.menuOpen}
      options={lookupData}
      getOptionLabel={optionContainer => optionContainer.getDisplayName()}
      getOptionValue={optionContainer => optionContainer
        .getItemFieldValue(fkMetadata.fkTargetFieldName)}
      classNamePrefix="Ed-react-select"
      className="Ed-react-select-container" />;
  }
}

export default observer(EditFieldFk);
