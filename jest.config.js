const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

// Third party bundles are vendored as-is, so they are excluded from coverage
const VENDORED = [
    'lwc/redux/**',
    'lwc/reduxEggs/core.js',
    'lwc/reduxEggs/saga.js',
    'lwc/reduxEggs/toolkit.js',
    'lwc/reduxObservable/**',
    'lwc/reduxSaga/**',
    'lwc/reduxThunk/**',
    'lwc/reduxToolkit/immer.js',
    'lwc/reduxToolkit/toolkit.js',
    'lwc/reduxUndo/**',
    'lwc/reselect/**',
    'lwc/rxjs/**'
];

module.exports = {
    ...jestConfig,
    collectCoverageFrom: [
        'force-app/**/lwc/**/*.js',
        'examples/**/lwc/**/*.js',
        '!**/__tests__/**',
        ...VENDORED.map((glob) => `!force-app/**/${glob}`)
    ],
    // Test-only components (not deployed), used to render connected components inside a provider
    moduleNameMapper: {
        '^c/(reduxTestHost|reduxTestChild)$': '<rootDir>/test/fixtures/lwc/$1/$1',
        '^test-utils$': '<rootDir>/test/utils/index.js'
    },
    // the first test of a file transforms the large vendored bundles, which is slow without a warm cache
    testTimeout: 30000,
    setupFilesAfterEnv: [...jestConfig.setupFilesAfterEnv, '<rootDir>/jest.setup.js']
};
