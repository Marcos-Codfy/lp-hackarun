export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'domain',
        'application',
        'infra',
        'ui',
        'sections',
        'experience',
        'motion',
        'a11y',
        'perf',
        'seo',
        'content',
        'docs',
        'ci',
        'deps',
        'config',
        'tests',
      ],
    ],
  },
};
