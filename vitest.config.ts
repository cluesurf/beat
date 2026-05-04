import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: false,
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/out/**'],
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, '$1') },
    ],
  },
})
