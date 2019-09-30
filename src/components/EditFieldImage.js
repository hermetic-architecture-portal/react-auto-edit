import React from 'react'; // eslint-disable-line no-unused-vars
import base64 from 'base64-arraybuffer';
import { observer } from 'mobx-react';

const readPromise = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = e => reject(e);
  reader.readAsArrayBuffer(file);
});

/**
 * @typedef {import('../ItemContainer').default} ItemContainer
 * @param {Object} props
 * @param {ItemContainer} props.container
 */
const EditFieldImage = ({
  fieldName, container, readonly,
}) => {
  const fileSelected = async (event) => {
    if (event.target.files.length) {
      const file = event.target.files[0];
      const buffer = await readPromise(file);
      const base64Img = base64.encode(buffer);
      container.setItemFieldValue(fieldName, base64Img);
    }
  };
  const img = container.getItemFieldValue(fieldName);
  const imgElement = img ? <img src={`data:image/png;base64,${img}`} alt=''/>
    : <React.Fragment>No image</React.Fragment>;

  return <div className='Ed-image'>
    <div>
      <input type="file" accept="image/*" multiple={false}
        readOnly={readonly}
        onChange={fileSelected} />
    </div>
    <div>{imgElement}</div>
  </div>;
};

export default observer(EditFieldImage);
