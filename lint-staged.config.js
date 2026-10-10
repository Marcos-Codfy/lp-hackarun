// pdf de documentação se regenera sozinho quando a stack ou o guia mudam
export default {
  '*.{ts,js,mjs,astro}': ['eslint --fix', 'prettier --write'],
  '*.{css,json,md,yml,yaml}': ['prettier --write'],
  '{package.json,docs/stack-manifest.json,docs/GUIA_DO_PROJETO.md}': () => [
    'node scripts/docs/build-docs.ts',
    'git add docs/pdf',
  ],
};
