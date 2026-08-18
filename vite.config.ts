import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/opengaz/"); local dev uses "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
