import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    globals: true,
    hookTimeout: 30000,
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      AWS_REGION: 'ap-northeast-1',
      DYNAMODB_ENDPOINT: 'http://localhost:8000',
    },
  },
});
