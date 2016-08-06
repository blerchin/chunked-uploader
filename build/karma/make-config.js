import { NODE_ENV, SRC_DIRNAME } from '../../config';
import makeWebpackConfig from '../webpack/make-config';

const KARMA_ENTRY = 'karma.entry.js';
const WEBPACK_CONFIG = makeWebpackConfig(
  require('../webpack/client')('development')
);

function makeDefaultConfig () {
  return {
    files : [
      `./${KARMA_ENTRY}`
    ],
    frameworks : ['chai', 'mocha', 'sinon-chai'],
    preprocessors : {
      [KARMA_ENTRY] : ['webpack'],
      [`${SRC_DIRNAME}/**/*.js`] : ['webpack']
    },
    reporters : ['spec'],
    browsers : ['Chrome', 'Firefox'],
    webpack : {
      devtool : 'inline-source-map',
      resolve : WEBPACK_CONFIG.resolve,
      module  : {
        loaders : WEBPACK_CONFIG.module.loaders
      }
    },
    webpackMiddleware : {
      noInfo : true
    },
    plugins: [
      require('karma-webpack'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-chai-plugins'),
      require('karma-coverage'),
      require('karma-phantomjs-launcher'),
      require('karma-firefox-launcher'),
      require('karma-chrome-launcher'),
      require('karma-spec-reporter')
    ]
  };
}

export default function (karmaConfig) {
  return karmaConfig.set(
    require(`./configs/_${NODE_ENV}`)(makeDefaultConfig())
  );
};
