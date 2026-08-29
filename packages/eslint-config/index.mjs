import { defineConfig, globalIgnores } from 'eslint/config'

export function createReactConfig({ js, globals, reactHooks, reactRefresh }) {
  return defineConfig([
    globalIgnores(['dist']),
    {
      files: ['**/*.{js,jsx}'],
      extends: [
        js.configs.recommended,
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
      ],
      languageOptions: {
        globals: globals.browser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  ])
}
