import { BskyAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
const envPath = path.resolve(process.cwd(), 'client/.env.test');
console.log('Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

let agentInstance: BskyAgent | null = null;
let loginPromise: Promise<BskyAgent> | null = null;

export async function setupTestAgent(): Promise<BskyAgent> {
  // If we already have a logged-in agent, return it
  if (agentInstance) {
    return agentInstance;
  }

  // If we're in the process of logging in, wait for that to complete
  if (loginPromise) {
    return loginPromise;
  }

  // Create a new login promise
  loginPromise = (async () => {
    console.log('Setting up test agent...');
    console.log('Environment variables:');
    console.log('BSKY_IDENTIFIER exists:', !!process.env.BSKY_IDENTIFIER);
    console.log('BSKY_APP_PASSWORD exists:', !!process.env.BSKY_APP_PASSWORD);
    console.log('Current working directory:', process.cwd());

    console.log('Creating BskyAgent instance...');
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    console.log('BskyAgent instance created');

    const identifier = process.env.BSKY_IDENTIFIER;
    const password = process.env.BSKY_APP_PASSWORD;

    if (!identifier || !password) {
      throw new Error('BSKY_IDENTIFIER and BSKY_APP_PASSWORD environment variables must be set');
    }

    try {
      console.log('Starting login...');
      const loginResponse = await agent.login({ identifier, password }).catch(error => {
        console.error('Login error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        throw error;
      });
      console.log('Login response received:', JSON.stringify(loginResponse, null, 2));
      console.log('Login successful');
      
      // Store the logged-in agent
      agentInstance = agent;
      loginPromise = null;
      
      return agent;
    } catch (error) {
      console.error('Login failed with error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      loginPromise = null;
      throw error;
    }
  })();

  return loginPromise;
}
