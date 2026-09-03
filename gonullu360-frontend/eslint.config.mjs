import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['build/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' }],
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.{test,spec}.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
