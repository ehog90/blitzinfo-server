const path = require('path');

module.exports = {
   extends: ['tslint:recommended', 'tslint-plugin-prettier', 'tslint-config-prettier'],
   rules: {
      prettier: [true, path.join(__dirname, 'prettier.conf.js')],
      'array-type': false,
      'arrow-parens': false,
      deprecation: {
         severity: 'warn',
      },
      'max-line-length': [true, 110],
      'import-blacklist': [true, 'rxjs/Rx'],
      'interface-name': false,
      'max-classes-per-file': false,
      'member-access': [true, 'check-accessor'],
      'member-ordering': [
         true,
         {
            order: ['static-field', 'instance-field', 'static-method', 'instance-method'],
         },
      ],
      'no-consecutive-blank-lines': false,
      'no-console': [true, 'debug', 'info', 'time', 'timeEnd', 'trace'],
      'no-empty': false,
      'no-inferrable-types': [true, 'ignore-params'],
      'no-non-null-assertion': true,
      'no-redundant-jsdoc': true,
      'no-switch-case-fall-through': true,
      'no-var-requires': false,
      'object-literal-key-quotes': [true, 'as-needed'],
      'object-literal-sort-keys': false,
      'ordered-imports': false,
      quotemark: [true, 'single'],
      'trailing-comma': false,
   },
};
