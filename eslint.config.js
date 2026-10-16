import js from '@eslint/js'
import globals from 'globals'
import pluginCypress from 'eslint-plugin-cypress'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.wrangler', 'cypress/screenshots', 'cypress/videos', 'cypress/downloads']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ['cypress/**/*.{ts,tsx}'],
    extends: [pluginCypress.configs.recommended],
  },
])
