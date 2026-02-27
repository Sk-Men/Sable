import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import css from '@eslint/css';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import unusedImports from 'eslint-plugin-unused-imports';
import eslintConfigPrettier from 'eslint-config-prettier';

const sourceFiles = ['src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'];
const tsSourceFiles = ['src/**/*.{ts,tsx,mts,cts}'];
const jsSourceFiles = ['src/**/*.{js,jsx,mjs,cjs}'];
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));
const scopedRecommendedTsConfigs = tseslint.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: sourceFiles }
);
const scopedRecommendedTypeCheckedTsConfigs = tseslint.configs.recommendedTypeChecked.map(
  (config) => (config.files ? config : { ...config, files: sourceFiles })
);

export default defineConfig(
  includeIgnoreFile(gitignorePath),
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
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: './tsconfig.json',
        }),
        createNodeResolver(),
      ],
    },
  },
  { ...js.configs.recommended, files: sourceFiles },
  ...scopedRecommendedTsConfigs,
  ...scopedRecommendedTypeCheckedTsConfigs,
  { ...importX.flatConfigs.recommended, files: sourceFiles },
  { ...importX.flatConfigs.typescript, files: tsSourceFiles },
  { ...react.configs.flat.recommended, files: sourceFiles },
  { ...react.configs.flat['jsx-runtime'], files: sourceFiles },
  { ...jsxA11y.flatConfigs.recommended, files: sourceFiles },
  { ...reactHooks.configs.flat.recommended, files: sourceFiles },
  { ...tseslint.configs.disableTypeChecked, files: jsSourceFiles },
  { ...eslintConfigPrettier, files: sourceFiles },
  {
    files: sourceFiles,
    plugins: {
      'unused-imports': unusedImports,
    },
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
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'error',
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
