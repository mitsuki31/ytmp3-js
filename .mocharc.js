module.exports = {
  // Executions
  bail: false,
  parallel: false,
  jobs: 1,
  retries: 0,
  color: true,
  reporter: 'spec',
  'node-option': [],
  // Diffs
  diff: false,
  'inline-diffs': true,
  'full-trace': false,  // Enable this if want to more verbose in debugging
  // Files
  recursive: true,
  extensions: [
    '.spec.js', '.spec.cjs', '.spec.mjs',
    '.test.js', '.test.cjs', '.test.mjs'
  ],
  ignore: [
    'test/assets/**',
    'tmp/**',
    'coverage/**',
    'docs/**'
  ],
  // Restrictions
  global: [],
  'check-leaks': false,
  'allow-uncaught': false,
  'async-only': false,
  'forbid-only': true,
  'forbid-pending': false
};
