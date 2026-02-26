import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import css from '@eslint/css';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';

const sourceFiles = ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'];
const tsSourceFiles = ['**/*.{ts,tsx,mts,cts}'];
const jsSourceFiles = ['**/*.{js,jsx,mjs,cjs}'];
const scopedRecommendedTsConfigs = tseslint.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: sourceFiles }
);
const scopedRecommendedTypeCheckedTsConfigs = tseslint.configs.recommendedTypeChecked.map(
  (config) => (config.files ? config : { ...config, files: sourceFiles })
);

export default defineConfig(
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: css.configs.recommended.rules,
  },
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        JSX: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  { ...js.configs.recommended, files: sourceFiles },
  ...scopedRecommendedTsConfigs,
  ...scopedRecommendedTypeCheckedTsConfigs,
  { ...importPlugin.flatConfigs.recommended, files: sourceFiles },
  { ...importPlugin.flatConfigs.typescript, files: tsSourceFiles },
  { ...react.configs.flat.recommended, files: sourceFiles },
  { ...react.configs.flat['jsx-runtime'], files: sourceFiles },
  { ...reactHooks.configs.flat.recommended, files: sourceFiles },
  { ...tseslint.configs.disableTypeChecked, files: jsSourceFiles },
  { ...eslintConfigPrettier, files: sourceFiles },
  {
    files: sourceFiles,
    rules: {
      'linebreak-style': 'off',
      'no-unused-vars': 'off',
      'no-underscore-dangle': 'off',
      'no-shadow': 'off',
      'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
      'react/jsx-filename-extension': [
        'error',
        {
          extensions: ['.tsx', '.jsx'],
        },
      ],
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^React$',
        },
      ],
      '@typescript-eslint/no-shadow': 'error',
    },
  },
  {
    files: tsSourceFiles,
    rules: {
      'no-undef': 'off',
    },
  }
);
