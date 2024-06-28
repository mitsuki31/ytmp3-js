/**
 * JSDoc configuration file.
 *
 * @author  Ryuu Mitsuki (https://github.com/mitsuki31)
 */

'use strict';

module.exports = {
  sourceType: 'module',
  recurseDepth: 2,
  plugins: [ 'plugins/markdown' ],
  source: {
    include: [ 'lib' ],
    exclude: [ 'docs', 'node_modules' ],
    includePattern: /.+\.[tj]s(doc|x)?$/,
    excludePattern: /(^|\/|\\)_/
  },
  tags: {
    allowUnknownTags: false,
    dictionaries: [
      'jsdoc',
      'closure'
    ]
  },
  opts: {
    encoding: 'utf8',
    destination: 'docs',
    readme: 'README.md',
    package: 'package.json',
    recurse: true,
    verbose: true,
  },
  templates: {
    cleverLinks: true,
    monospaceLinks: false
  },
};
