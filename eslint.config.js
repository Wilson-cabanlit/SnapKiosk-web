export default [
  { ignores: ['**/dist/**','**/coverage/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { window:'readonly',document:'readonly',fetch:'readonly',crypto:'readonly',console:'readonly',process:'readonly',URL:'readonly',Intl:'readonly',Date:'readonly',Promise:'readonly',setTimeout:'readonly',clearTimeout:'readonly' } },
    rules: { 'no-unused-vars': ['error',{ varsIgnorePattern:'^[A-Z_]', argsIgnorePattern:'^_' }], 'no-undef':'error' },
  },
];
