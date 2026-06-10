import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror tsconfig "paths": "@/*" -> repo root (vitest doesn't read tsconfig paths).
    alias: { '@': repoRoot },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    // lib/db/client.ts reads DATABASE_URL at module-load time (const DB_PATH at
    // top level), NOT lazily inside getDb(). The env must therefore be set in a
    // setupFile, which vitest evaluates before any test-file import graph loads.
    setupFiles: ['tests/setup.ts'],
  },
});
