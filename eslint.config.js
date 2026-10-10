import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'coverage/', 'docs/dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // regra de dependência da clean architecture: domínio não conhece ninguém
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@application/*', '@infrastructure/*', '@presentation/*', '@composition/*'],
              message: 'Domain must not depend on outer layers.',
            },
            {
              group: ['three', 'gsap', 'gsap/*', 'lenis', 'astro', 'astro:*'],
              message: 'Domain must stay framework-free.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@infrastructure/*', '@presentation/*', '@composition/*'],
              message: 'Application depends only on domain.',
            },
            {
              group: ['three', 'gsap', 'gsap/*', 'lenis', 'astro', 'astro:*'],
              message: 'Application must stay framework-free.',
            },
          ],
        },
      ],
    },
  },
);
