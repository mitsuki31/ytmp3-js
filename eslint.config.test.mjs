/**
 * ESLint flat configuration for test environment.
 */

// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import mochaPlugin from 'eslint-plugin-mocha';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      tseslint: tseslintPlugin,
      mocha: mochaPlugin,
    },
    ignores: [
      'docs/',
      'coverage/',
      'src/',
      'bin/',
      'config/example/**/*.{mjs,js,json}',
      'index.{j,t}s',
      'jsdoc.config.js',
      'eslint.config.*',
      '.mocharc.js',
    ],
    files: [
      'test/**/*.{ts,js}',
    ],
    languageOptions: {
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
  }
);
