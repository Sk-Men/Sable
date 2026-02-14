import { fileURLToPath } from 'node:url';
import path from 'node:path';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import css from '@eslint/css';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: css.configs.recommended.rules,
  },
  ...compat
    .config({
      env: {
        browser: true,
        es2021: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'airbnb',
        'prettier',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        JSX: 'readonly',
      },
      plugins: ['react', '@typescript-eslint'],
      rules: {
        'linebreak-style': 0,
        'no-unused-vars': 'off',
        'no-underscore-dangle': 0,
        'no-shadow': 'off',
        'import/prefer-default-export': 'off',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
          },
        ],
        'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
        'react/jsx-filename-extension': [
          'error',
          {
            extensions: ['.tsx', '.jsx'],
          },
        ],
        'react/require-default-props': 'off',
        'react/jsx-props-no-spreading': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-shadow': 'error',
      },
      overrides: [
        {
          files: ['*.ts'],
          rules: {
            'no-undef': 'off',
          },
        },
      ],
    })
    .map((config) =>
      config.files ? config : { ...config, files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'] }
    ),
];
