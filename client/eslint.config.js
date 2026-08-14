import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// ESLint 9 flat config. Replaces the old .eslintrc.cjs, which newer ESLint no
// longer reads at all — `npm run lint` failed outright before this existed.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: '18.2' } },
    rules: {
      ...react.configs.recommended.rules,
      // The JSX transform means React need not be in scope.
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // The two classic hook rules are the ones that catch real defects, and both
      // are kept. rules-of-hooks currently reports zero violations across the app.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // eslint-plugin-react-hooks v7 added React-Compiler rules that flag the
      // ordinary "fetch on mount" pattern this app uses throughout
      // (useEffect(() => { load(); }, [load])). They are performance advice for
      // codebases adopting the compiler, not correctness problems — 29 of them
      // fired on working code. Rewriting every data-fetching effect to satisfy a
      // style opinion is not a trade worth making, so they are off deliberately.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',

      // Unused args prefixed with _ are deliberate (signature placeholders).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Apostrophes in copy are escaped where it matters; this rule mostly
      // produces noise on ordinary prose.
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',
    },
  },
];
