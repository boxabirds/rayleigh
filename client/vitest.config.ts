import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
const envPath = path.resolve(__dirname, '.env.test');
console.log('Loading environment variables from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env.test file:', result.error);
  process.exit(1);
} else {
  console.log('Environment variables loaded successfully');
  console.log('BSKY_IDENTIFIER exists:', !!process.env.BSKY_IDENTIFIER);
  console.log('BSKY_APP_PASSWORD exists:', !!process.env.BSKY_APP_PASSWORD);
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: [],
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: [],
    env: {
      NODE_ENV: 'test'
    }
  },
});
