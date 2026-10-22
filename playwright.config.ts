import { createHash } from 'node:crypto';
import { defineConfig } from '@playwright/test';

// Each checkout (including agent worktrees) gets its own port, so parallel runs never share a dev server.
const port = 5174 + (createHash('sha1').update(process.cwd()).digest().readUInt16BE(0) % 500);

export default defineConfig({
  testDir: 'e2e',
  // A full Shift played by keyboard takes ~25 s; the 30 s default leaves no headroom.
  timeout: 60_000,
  use: { baseURL: `http://localhost:${port}` },
  // `--mode e2e` turns on the test hook (window.__kitchen); production builds don't have it.
  webServer: { command: `pnpm exec vite --mode e2e --port ${port} --strictPort`, url: `http://localhost:${port}` },
});
