// Configuration plate d'ESLint : règles JS/TS recommandées, Vue (sans v-html) et TSDoc obligatoire sur les exports.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import jsdoc from 'eslint-plugin-jsdoc'

export default tseslint.config(
  {
    ignores: ['dist/', 'public/data/', '.cache/', 'node_modules/', 'data/', 'tools/', 'docs/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    plugins: { jsdoc },
    rules: {
      'vue/no-v-html': 'error',
      // Un export public (fonction, classe, type, interface, constante fléchée) porte un commentaire de documentation.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
            MethodDefinition: false,
          },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'TSEnumDeclaration'],
        },
      ],
    },
  },
  {
    // Les tests et fichiers de configuration n'exportent pas d'API à documenter.
    files: ['tests/**', '*.config.{js,ts}'],
    rules: { 'jsdoc/require-jsdoc': 'off' },
  },
)
