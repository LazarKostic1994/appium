'use strict';

module.exports = (wallaby) => {
  return {
    compilers: {
      '**/*.js': wallaby.compilers.babel({
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                node: '14',
              },
              shippedProposals: true,
            },
          ],
        ],
        comments: false,
        retainLines: true,
        sourceMaps: true,
      }),
      '**/*.ts?(x)': wallaby.compilers.typeScript({useStandardDefaults: true}),
    },
    debug: true,
    env: {
      type: 'node',
    },
    files: [
      './packages/*/lib/**/*.(j|t)s',
      './packages/*/test/**/*helper*.(j|t)s',
      './packages/*/test/**/*mock*.(j|t)s',
      './packages/*/package.json',
      './packages/*/test/**/fixture?(s)/**/*',
      {
        instrument: false,
        pattern: './packages/typedoc-plugin-appium/resources/**/*',
      },
      {
        binary: true,
        pattern: './packages/support/test/unit/assets/sample_binary.plist',
      },
      {
        instrument: false,
        pattern: './packages/support/test/unit/assets/sample_text.plist',
      },
      {
        instrument: false,
        pattern: './packages/base-driver/static/**/*',
      },
      '!./packages/*/test/**/*-specs.js',
      '!./packages/*/test/**/*.e2e.spec.(j|t)s',
      '!**/local_appium_home/**',
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/unit/**/*.spec.(j|t)s',
      '!**/local_appium_home/**',
    ],
    workers: {
      restart: true,
    },
    setup() {
      // This copied out of `./test/setup.js`, which uses `@babel/register`.
      // Wallaby doesn't need `@babel/register` (and it probably makes Wallaby slow),
      // but we need the other stuff, so here it is.

      const chai = require('chai');
      const chaiAsPromised = require('chai-as-promised');
      const sinonChai = require('sinon-chai');

      // The `chai` global is set if a test needs something special.
      // Most tests won't need this.
      global.chai = chai.use(chaiAsPromised).use(sinonChai);

      // `should()` is only necessary when working with some `null` or `undefined` values.
      global.should = chai.should();
    },
    runMode: 'onsave',
  };
};
