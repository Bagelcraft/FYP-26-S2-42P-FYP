const js = require('@eslint/js');
const globals = require('globals');

// ESLint 9 flat config. Replaces the old .eslintrc.cjs, which newer ESLint no
// longer reads — `npm run lint` failed outright before this existed.
module.exports = [
  { ignores: ['node_modules/**', 'prisma/migrations/**'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Unused args prefixed with _ are deliberate. Express error handlers must
      // declare (err, req, res, next) in full even when next goes unused.
      // ignoreRestSiblings covers the deliberate `const { password_hash, ...safe }`
      // idiom used to strip the hash before returning a user.
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_|^next$',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // This is a server: logging is the point.
      'no-console': 'off',
    },
  },
];
