import React from 'react'; // eslint-disable-line no-unused-vars
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
  fieldName, container, readonly, maxFileSize,
}) => {
  const maxFileSizeText = () => {
    let text = `${maxFileSize} bytes`;
    if (maxFileSize >= 1024 && maxFileSize < 1048576) {
      text = `${maxFileSize / 1024} kb`;
    } else if (maxFileSize >= 1048576) {
      text = `${maxFileSize / 1024 / 1024} mb`;
    }
    return text;
  };
  const fileSelected = async (event) => {
    if (event.target.files.length) {
      const file = event.target.files[0];
      const buffer = await readPromise(file);
      const base64Img = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
      container.setItemFieldValue(fieldName, base64Img);
      if (file.size > maxFileSize) {
        container.addError(
          fieldName,
          `Image size too large, max size is ${maxFileSizeText()}`,
        );
      }
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
