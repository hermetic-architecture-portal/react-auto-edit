const path = require('path');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        alias: {
          // ignore the cut down browser distribution that 
          // joi's package.json steers webpack to
          joi: path.resolve(__dirname, 'node_modules/joi/lib/index.js'),
        },
      },
    },
  },
};
