import { defineConfig } from 'vite';

// GitHub Pages serves the project under /node-kitchen/ (build and `vite preview`); dev, e2e and tests stay at /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/node-kitchen/' : '/',
}));
