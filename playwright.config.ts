import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5174' },
  // `--mode e2e` turns on the test hook (window.__kitchen); production builds don't have it.
  webServer: { command: 'pnpm exec vite --mode e2e --port 5174 --strictPort', url: 'http://localhost:5174' },
});
