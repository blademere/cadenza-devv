import js from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

export function createReactConfig({ reactHooks, reactRefresh }) {
  return [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
    {
      files: ['**/*.{js,jsx}'],
      languageOptions: {
        sourceType: 'module',
        globals: globals.browser,
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    },
  ]
}

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    plugins: { js },
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
])
