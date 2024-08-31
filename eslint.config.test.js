/**
 * ESLint flat configuration for test environment.
 */

'use strict';

const globals = require('globals');
const mochaPlugin = require('eslint-plugin-mocha');
const baseConfig = require('./eslint.config.js');

module.exports = [
  {
    ignores: [
      '**/docs/',
      '**/coverage/',
      'config/example/**.{mjs,js,json}',
      'lib/',
      'bin/',
      'index.js',
      'eslint.config.*'
    ]
  },

  mochaPlugin.configs.flat.recommended,

  {
    files: [
      '**/test/'
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...globals.mocha
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      ...baseConfig[baseConfig.length - 1].rules
    }
  }
];
