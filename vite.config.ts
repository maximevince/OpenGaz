import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function git(...args: string[]): string {
  return execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
}

/** Short commit the bundle was built from, stamped on the title screen. */
function commit(): string {
  // Actions checkouts are detached and may be shallow, so trust the workflow's SHA there
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    const sha = git('rev-parse', '--short=7', 'HEAD');
    return git('status', '--porcelain') ? `${sha}-dirty` : sha;
  } catch {
    return 'unknown'; // building from a tarball, or without git installed
  }
}

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/opengaz/"); local dev uses "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GIT_SHA__: JSON.stringify(commit()),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
