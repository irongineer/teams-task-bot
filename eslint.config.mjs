import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import importX from 'eslint-plugin-import-x';
import unusedImports from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import vitest from 'eslint-plugin-vitest';

export default tseslint.config(
  // (1) Global ignores
  {
    ignores: [
      'dist/',
      'cdk.out/',
      'node_modules/',
      'coverage/',
      '**/*.d.ts',
      'vitest.config.ts',
      'vitest.config.integration.ts',
    ],
  },

  // (2) Base config
  eslint.configs.recommended,
  prettierConfig,

  // (3) TypeScript - Apply strict configs only to .ts files
  {
    files: ['**/*.ts'],
    ...tseslint.configs.strictTypeChecked[0],
    ...tseslint.configs.stylisticTypeChecked[0],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      ...(tseslint.configs.strictTypeChecked[0]?.rules || {}),
      ...(tseslint.configs.stylisticTypeChecked[0]?.rules || {}),
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': 'off', // unused-imports に委譲
    },
  },

  // (4) Import
  {
    files: ['**/*.ts'],
    plugins: {
      'import-x': importX,
      'unused-imports': unusedImports,
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      ...importX.flatConfigs.recommended.rules,
      ...importX.flatConfigs.typescript.rules,
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-cycle': 'error',
      'unused-imports/no-unused-imports': 'error',
    },
  },

  // (5) Boundaries (ヘキサゴナルアーキテクチャの依存方向を強制)
  {
    files: ['src/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'adapter-driving', pattern: 'src/adapters/driving/**' },
        { type: 'adapter-driven', pattern: 'src/adapters/driven/**' },
        { type: 'composition', pattern: 'src/composition/**' },
        { type: 'handler', pattern: 'src/handlers/**' },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // domain → domain のみ
            { from: 'domain', allow: ['domain'] },
            // application → domain, application
            { from: 'application', allow: ['domain', 'application'] },
            // adapter-driving → domain, application, shared
            { from: 'adapter-driving', allow: ['domain', 'application', 'shared'] },
            // adapter-driven → domain, shared
            { from: 'adapter-driven', allow: ['domain', 'shared'] },
            // composition → 全レイヤー
            {
              from: 'composition',
              allow: [
                'domain',
                'application',
                'adapter-driving',
                'adapter-driven',
                'composition',
                'handler',
                'shared',
              ],
            },
            // handler → composition, shared
            { from: 'handler', allow: ['composition', 'shared'] },
            // shared → shared
            { from: 'shared', allow: ['shared'] },
          ],
        },
      ],
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            // domain から外部ライブラリを禁止
            {
              from: 'domain',
              disallow: ['@aws-sdk/*', '@microsoft/*', 'express', '@codegenie/*'],
              message:
                'Domain layer must not depend on external libraries like AWS SDK, Microsoft SDKs, or Express',
            },
          ],
        },
      ],
    },
  },

  // (6) Test files
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'boundaries/element-types': 'off',
      'boundaries/external': 'off',
    },
  },

  // (7) CDK files
  {
    files: ['infra/**/*.ts'],
    rules: {
      'boundaries/element-types': 'off',
      'boundaries/external': 'off',
    },
  },
);
