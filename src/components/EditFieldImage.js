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
 * @param {string} props.fieldName
 * @param {boolean} props.readonly
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
  const removeImage = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Remove selected image?')) {
      const base64Img = base64.encode('');
      container.setItemFieldValue(fieldName, base64Img);
    }
  };
  const img = container.getItemFieldValue(fieldName);
  const imgElement = !img ? <React.Fragment>No image</React.Fragment>
    : <div>
        <img src={`data:image/png;base64,${img}`} alt=''/>
        <div className="Ed-button" onClick={removeImage}>&nbsp;x&nbsp;</div>
      </div>;

  return <div className='Ed-image'>
    <div>
      <input type="file" accept="image/*" multiple={false}
        readOnly={readonly}
        onChange={fileSelected} />
    </div>
    {imgElement}
  </div>;
};

export default observer(EditFieldImage);
