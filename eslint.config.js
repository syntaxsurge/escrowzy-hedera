import eslintPluginNext from '@next/eslint-plugin-next'

import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginImport from 'eslint-plugin-import'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  /* ---------------------------------------------------------------------- */
  /*                          I G N O R E   P A T H S                       */
  /* ---------------------------------------------------------------------- */
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/out/**',
      '**/public/**',
      '**/artifacts/**',
      '**/contracts/**',
      '**/cache/**',
      '**/typechain-types/**',
      '**/.git/**',
      '**/.vscode/**',
      '**/.idea/**',
      '**/.husky/**',
      '**/.vercel/**',
      '**/.turbo/**',
      '**/.output/**',
      '**/.cache/**',
      '**/.DS_Store'
    ]
  },

  /* ---------------------------------------------------------------------- */
  /*                       N E X T . J S  P L U G I N                       */
  /* ---------------------------------------------------------------------- */
  {
    plugins: {
      '@next/next': eslintPluginNext
    },
    /* Merge Core Web Vitals recommended rules */
    rules: {
      ...eslintPluginNext.configs['core-web-vitals'].rules
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                         P R E T T I E R   O V E R R I D E               */
  /* ---------------------------------------------------------------------- */
  eslintConfigPrettier,

  /* ---------------------------------------------------------------------- */
  /*                            T S   P R O J E C T                          */
  /* ---------------------------------------------------------------------- */
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'unused-imports': unusedImports,
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
      '@next/next': eslintPluginNext
    },
    rules: {
      /* ---------- Unused imports / vars ---------- */
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      /* ---------- Import ordering ---------- */
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index']
          ],
          pathGroups: [
            {
              pattern: '{react,next/**,@next/**}',
              group: 'external',
              position: 'before'
            },
            {
              /* Internal aliases including hooks */
              pattern: '{@/components/**,@/hooks/**,@/lib/**,@/**}',
              group: 'internal',
              position: 'after'
            }
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          },
          'newlines-between': 'always'
        }
      ],

      /* ---------- TypeScript ---------- */
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      /* ---------- Prettier ---------- */
      'prettier/prettier': 'warn'
    }
  }
]
