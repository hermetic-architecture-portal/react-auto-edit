const filepath = `${process.argv[3]}/package.json`;
const pack = require(filepath);
pack.dependencies['react-auto-edit']=`^${process.argv[2]}`;
const json=JSON.stringify(pack,null,2);
require('fs').writeFileSync(filepath,json);