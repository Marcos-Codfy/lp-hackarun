import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import { builtinRules } from 'eslint/use-at-your-own-risk';

// teto de 250 linhas quebra o lint; a partir de 200 só avisa. A mesma regra não aceita dois limites, então o
// aviso usa uma cópia da max-lines (builtinRules é API sem garantia: se sumir num major, fica só o teto)
const LINE_COUNT = { skipBlankLines: true, skipComments: true };
const softLimit = { rules: { 'max-lines': builtinRules.get('max-lines') } };

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'coverage/', 'docs/dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'soft-limit': softLimit },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      'max-lines': ['error', { max: 250, ...LINE_COUNT }],
      'soft-limit/max-lines': ['warn', { max: 200, ...LINE_COUNT }],
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
  {
    // a apresentação enxerga só as portas da aplicação; adapter concreto quem liga é o src/composition
    files: ['src/presentation/**/*.{ts,astro}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@infrastructure/*', '**/infrastructure/**'],
              message: 'Presentation depends on application ports; adapters are wired in src/composition.',
            },
          ],
        },
      ],
    },
  },
  {
    // utilitário sem regra de negócio: não conhece camada nenhuma
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@domain/*',
                '@application/*',
                '@infrastructure/*',
                '@presentation/*',
                '@composition/*',
              ],
              message: 'Shared must not depend on any layer.',
            },
          ],
        },
      ],
    },
  },
);
