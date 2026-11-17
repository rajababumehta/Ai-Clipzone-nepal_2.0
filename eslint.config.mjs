import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'api/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
