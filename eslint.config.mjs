// ============================================================================
// AstroSim — flat ESLint config (ESLint 9 + typescript-eslint)
// ============================================================================
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'js/**', 'client/public/**']
  },
  ...tseslint.configs.recommended,
  {
    files: ['server/src/**/*.ts', 'client/src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  }
);
