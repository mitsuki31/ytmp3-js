/**
 * ESLint flat configuration for production environment.
 */

// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      'docs/',
      'test/',
      'build/',
      'coverage/',
      'config/example/**/*.{mjs,js,json}',
      'jsdoc.config.js',
      'eslint.config.*',
      '.mocharc.js'
    ],
  },
  {
    name: '@ytmp3-js/production',
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
    ],
    plugins: {
      tseslint: tseslintPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
  }
);
