const { defineConfig } = require('@playwright/test');
process.env.E2E_ORGANIZATION_SLUG ||= `e2e-${Date.now()}`;
module.exports = defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 90000,
  use: { baseURL: 'http://localhost:3000', actionTimeout: 15000, channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm --prefix backend start', url: 'http://localhost:3001/health', timeout: 30000, reuseExistingServer: false },
    { command: 'npm --prefix frontend start', url: 'http://localhost:3000', timeout: 120000, reuseExistingServer: false, env: { BROWSER: 'none', REACT_APP_ORGANIZATION_SLUG: process.env.E2E_ORGANIZATION_SLUG } },
  ],
});
