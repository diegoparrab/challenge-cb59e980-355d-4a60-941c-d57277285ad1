module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'core', pattern: 'src/core/*' },
      { type: 'domain', pattern: 'src/domain/*' },
      { type: 'data', pattern: 'src/data/*' },
      { type: 'presentation', pattern: 'src/presentation/*' },
      { type: 'di', pattern: 'src/di/*' },
    ],
    'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    'import/resolver': {
      'babel-module': {},
    },
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        rules: [
          // core can only import from core
          { from: { type: 'core' }, allow: { to: { type: ['core'] } } },
          // domain imports from core and domain
          { from: { type: 'domain' }, allow: { to: { type: ['core', 'domain'] } } },
          // data imports from core, domain, and data
          { from: { type: 'data' }, allow: { to: { type: ['core', 'domain', 'data'] } } },
          // presentation imports from core, domain, and presentation (NOT data)
          {
            from: { type: 'presentation' },
            allow: { to: { type: ['core', 'domain', 'presentation'] } },
          },
          // di can import from all layers
          {
            from: { type: 'di' },
            allow: { to: { type: ['core', 'domain', 'data', 'presentation', 'di'] } },
          },
        ],
      },
    ],
  },
};
