'use strict';

const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es6
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    rules: {
      strict: [ 'error', 'safe' ],
      'eol-last': [ 'error', 'always' ],
      eqeqeq: [ 'error', 'always' ],
      'prefer-const': [ 'warn' ],
      'no-unused-vars': [ 'error', {
        argsIgnorePattern: '^_+',
        varsIgnorePattern: '^_+'
      }],
      'max-len': [ 'warn', {
        code: 90,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreRegExpLiterals: true
      }],
      indent: [ 'error', 2, {
        SwitchCase: 1,
        VariableDeclarator: 'first',
        FunctionExpression: {
          parameters: 'first',
          body: 1
        }
      }],
      'linebreak-style': [ 'warn', 'unix' ],
      quotes: [ 'warn', 'single', { avoidEscape: false } ],
      semi: [ 'error', 'always' ],
      camelcase: [ 'error', { properties: 'always' } ],
      curly: [ 'error', 'multi-line', 'consistent' ],
      'no-else-return': ['error'],
      'default-param-last': ['error'],
    },
    ignores: [
      'jsdoc.*',
      'jsdoc.config.*',
      'docs/**',
      'config/example/**'
    ]
  }
];
