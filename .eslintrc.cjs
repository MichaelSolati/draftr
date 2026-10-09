module.exports = {
  extends: [
    './node_modules/gts/',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.json',
      './packages/core/tsconfig.json',
      './apps/web/tsconfig.json',
      './apps/vscode/tsconfig.json',
      './apps/docs/tsconfig.json',
    ],
  },
  plugins: ['react', 'react-hooks', 'simple-import-sort'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Import sorting
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // GTS noisy node rules off
    'n/no-extraneous-import': 'off',
    'n/no-unpublished-import': 'off',
    'n/no-unsupported-features/es-builtins': 'off',
    'n/no-unsupported-features/node-builtins': 'off',
    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  overrides: [
    {
      files: ['plugins/**/*.js'],
      rules: {
        'n/no-process-exit': 'off',
        'n/shebang': 'off',
      },
    },
  ],
};
