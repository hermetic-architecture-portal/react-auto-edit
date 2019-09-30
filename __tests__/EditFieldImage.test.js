import React from 'react'; // eslint-disable-line no-unused-vars
import Adapter from 'enzyme-adapter-react-16';
import fs from 'fs';
import util from 'util';
import { shallow, configure } from 'enzyme';
import EditFieldImage from '../src/components/EditFieldImage';

configure({ adapter: new Adapter() });

class Container {
  setItemFieldValue(fieldName, value) {
    this[fieldName] = value;
    if (this.resolve) {
      this.resolve();
    }
  }

  getItemFieldValue(fieldName) {
    return this[fieldName];
  }
}

// eslint-disable-next-line max-len
const tinySamplePng = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

const testLoadFile = async (imageFileName, base64FileName) => {
  const container = new Container();
  const component = shallow(<EditFieldImage
    container={container} fieldName="fn"/>);
  const input = component.find('input[type="file"]');
  expect(input.length).toBe(1);
  const content = await util.promisify(fs.readFile)(imageFileName);
  const expected = await util.promisify(fs.readFile)(base64FileName, 'utf8');
  const files = [
    new File([content], 'example.png', { type: 'image/png' }),
  ];
  // enzyme doesn't cope with async event handlers very well - this is a hack
  // to make the test wait for setItemFieldValue to tbe called
  const promise = new Promise((resolve) => { container.resolve = resolve; });
  input.simulate('change', {
    target: {
      files,
    },
  });
  await promise;
  expect(container.getItemFieldValue('fn')).toBe(expected);
};

describe('EditFieldImage', () => {
  it('renders "No Image" when there is no image', () => {
    const container = new Container();
    const component = shallow(<EditFieldImage
      container={container} fieldName="fn"/>);
    const secondChild = component.childAt(1);
    expect(secondChild.length).toBe(1);
    expect(secondChild.text()).toBe('No image');
  });
  it('renders an image when there is one', () => {
    const container = new Container();
    container.setItemFieldValue('fn', tinySamplePng);
    const component = shallow(<EditFieldImage
      container={container} fieldName="fn"/>);
    const img = component.find('img');
    expect(img.length).toBe(1);
    expect(img.prop('src')).toBe(`data:image/png;base64,${tinySamplePng}`);
  });
  it('loads a small image', async () => {
    await testLoadFile('testData/3kb.png', 'testData/3kb.base64');
  });
  it('loads a big image', async () => {
    // this addresses a former issue with "RangeError: Maximum call stack size exceeded"
    // on String.fromCharCode
    await testLoadFile('testData/200kb.png', 'testData/200kb.base64');
  });
});
