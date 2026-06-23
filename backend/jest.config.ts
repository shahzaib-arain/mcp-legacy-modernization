import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  reporters: [
    'default',
    [
      'jest-allure2-reporter',
      {
        resultsDir: 'allure-results',
        attachments: {
          subDir: 'attachments',
        },
        environment: {
          project: 'NADRA Backend',
          environment: 'local',
        },
      },
    ],
  ],
};

export default config;
