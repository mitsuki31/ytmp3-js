module.exports = {
    env: {
        node: true,
        es6: true
    },
    extends: 'eslint:recommended',
    root: true,
    parserOptions: {
        ecmaVersion: 'latest',
        project: true
    },
    rules: {
        strict: ['error', 'safe'],
        'eol-last': ['error', 'always'],
        eqeqeq: ['error', 'always'],
        'prefer-const': ['error'],
        'max-len': [
            'warn',
            {
                code: 90,
                ignoreComments: true,
                ignoreTrailingComments: true,
                ignoreUrls: true,
                ignoreStrings: true,
                ignoreRegExpLiterals: true
            }
        ],
        indent: [
            'error',
            2,
            {
                SwitchCase: 1,
                VariableDeclarator: 'first',
                FunctionExpression: {
                    parameters: 'first',
                    body: 1
                }
            }
        ],
        'linebreak-style': [
            'warn',
            'unix'
        ],
        quotes: [
            'warn',
            'single',
            { avoidEscape: true }
        ],
        semi: [
            'error',
            'always'
        ],
        camelcase: [
            'error',
            { properties: 'always' }
        ],
        curly: [
            'error',
            'multi-line',
            'consistent'
        ],
        'no-else-return': ['error'],
        'default-param-last': ['error'],
    }
};
