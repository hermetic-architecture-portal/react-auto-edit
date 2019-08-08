const fs = require('fs');

const rootPaths = fs.readdirSync('src')
  .filter(p => p.endsWith('js'))
  .filter(p => !['index.js', 'constants.js'].includes(p))
  .map(p => p.replace('.js', ''));
const rootImports = rootPaths.map(p => `import ${p} from './${p}';`).join('\n');
const rootExports = rootPaths.map(p => `  ${p},`).join('\n');

const componentPaths = fs.readdirSync('src/components')
  .filter(p => p.endsWith('js'))
  .map(p => p.replace('.js', ''));
const componentImports = componentPaths.map(p => `import ${p} from './components/${p}';`).join('\n');
const componentExports = componentPaths.map(p => `  ${p},`).join('\n');

const content = `${rootImports}\n${componentImports}\n\nexport {\n${rootExports}\n${componentExports}\n};\n`;

fs.writeFileSync('./src/index.js', content);
