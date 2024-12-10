import { test, expect } from '@playwright/test';

test.setTimeout(120000); // 2 minute timeout for the entire test

test.beforeEach(async ({ page }) => {
  // Verify environment variables are available
  const identifier = process.env.BSKY_IDENTIFIER;
  const password = process.env.BSKY_APP_PASSWORD;
  
  if (!identifier || !password) {
    console.error('Environment variables not found. Checking for .env.test file...');
    throw new Error(
      'BSKY_IDENTIFIER and BSKY_APP_PASSWORD must be set in client/.env.test\n' +
      'Example .env.test format:\n' +
      'BSKY_IDENTIFIER=your-identifier\n' +
      'BSKY_APP_PASSWORD=your-app-password'
    );
  }
});

test('smoke test - auth flow and community creation', async ({ page }) => {
  // Enable debug logging
  page.on('console', msg => console.log('Browser log:', msg.text()));
  page.on('pageerror', err => console.error('Browser error:', err));
  page.on('requestfailed', req => console.error('Failed request:', req.url()));
  
  console.log('Starting test...');
  
  // Step 1: Navigate to the auth page and sign in
  console.log('Navigating to /auth...');
  await page.goto('/auth');
  console.log('Waiting for network idle...');
  await page.waitForLoadState('networkidle');
  
  // Debug: Log form elements
  console.log('Looking for form elements...');
  const formElements = await page.$$eval('form input', inputs => 
    inputs.map(input => ({
      name: input.name,
      type: input.type,
      id: input.id,
      placeholder: input.placeholder
    }))
  );
  console.log('Found form elements:', formElements);
  
  // Fill in the login form using more reliable selectors
  console.log('Filling login form...');
  await page.locator('form').waitFor({ state: 'visible', timeout: 10000 });
  
  // Fill in username field
  const usernameInput = page.getByLabel('Username or email', { exact: true });
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.fill(process.env.BSKY_IDENTIFIER!);
  
  // Fill in password field
  const passwordInput = page.getByLabel('Password', { exact: true });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(process.env.BSKY_APP_PASSWORD!);
  
  // Debug: Log button state
  const submitButton = page.getByRole('button', { name: 'Sign in' });
  await submitButton.waitFor({ state: 'visible', timeout: 10000 });
  const isEnabled = await submitButton.isEnabled();
  console.log('Submit button enabled:', isEnabled);
  
  console.log('Clicking submit...');
  await submitButton.click();
  
  // Wait for successful login and navigation to home
  console.log('Waiting for navigation to home...');
  await expect(page).toHaveURL('/', { timeout: 10000 });
  console.log('Successfully logged in');

  // Step 2: Navigate to #indiehacker community and verify posts
  console.log('Navigating to #indiehacker community...');
  await page.goto('/community/tags/indiehacker');
  console.log('Waiting for network idle...');
  await page.waitForLoadState('networkidle');
  console.log('Navigated to #indiehacker community');
  
  // Wait for posts and More button to load
  console.log('Waiting for posts and More button to load...');
  const moreButton = page.getByRole('button', { name: 'Load more posts' });
  await moreButton.waitFor({ state: 'visible', timeout: 20000 });
  
  // Get initial post count
  const initialPosts = await page.locator('.post-card').count();
  console.log('Initial post count:', initialPosts);
  expect(initialPosts).toBeGreaterThan(0);
  
  // Test pagination by clicking More
  console.log('Testing pagination...');
  await moreButton.click();
  await page.waitForLoadState('networkidle');
  
  // Verify we got more posts
  const newPostCount = await page.locator('.post-card').count();
  console.log('New post count after pagination:', newPostCount);
  expect(newPostCount).toBeGreaterThan(initialPosts);
  console.log('Pagination successful');

  // Step 3: Create a new community
  const uniqueTag = `test${Date.now()}`;
  console.log('Navigating to community creation...');
  await page.goto('/community/new');
  console.log('Waiting for network idle...');
  await page.waitForLoadState('networkidle');
  console.log('Creating new community with tag:', uniqueTag);
  
  await page.fill('input[name="name"]', `Test Community ${uniqueTag}`);
  await page.fill('textarea[name="description"]', 'A test community created by Playwright');
  await page.fill('textarea[name="rules"]', 'Be nice and respectful');
  await page.fill('input[name="hashtag"]', uniqueTag);

  console.log('Submitting community creation...');
  await page.click('button[type="submit"]');

  // Step 4: Verify successful community creation
  // Wait for navigation to the new community page
  console.log('Waiting for navigation to new community...');
  await expect(page).toHaveURL(new RegExp(`/community/tags/${uniqueTag}`), { timeout: 10000 });
  console.log('Successfully navigated to new community page');
  
  // Verify success toast
  console.log('Checking for success toast...');
  await expect(page.getByText(`You have successfully created the 'Test Community ${uniqueTag}' community!`)).toBeVisible({ timeout: 10000 });
  console.log('Success toast verified');
  
  // Verify community header
  console.log('Checking community header...');
  await expect(page.getByRole('heading', { name: `#${uniqueTag}` })).toBeVisible({ timeout: 10000 });
  console.log('Community header verified');
});
