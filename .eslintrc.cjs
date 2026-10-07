module.exports = {
  extends: [
    './node_modules/gts/',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.app.json', './tsconfig.node.json'],
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // GTS noisy node rules off
    'n/no-extraneous-import': 'off',
    'n/no-unsupported-features/es-builtins': 'off',
    'n/no-unsupported-features/node-builtins': 'off',
    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
};
