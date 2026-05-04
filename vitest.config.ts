import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globalSetup: './site/clue.surf/base/test/global-setup.ts',
    globals: false,
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/test.ts',
      '**/test.tsx',
    ],
  },
  resolve: {
    alias: [
      { find: /^@cluesurf\/base$/, replacement: path.resolve(__dirname, 'deck/base/host/index.js') },
      { find: /^@cluesurf\/base\/(.*)/, replacement: path.resolve(__dirname, 'deck/base/host/$1') },
      { find: /^@cluesurf\/back\/(.*)/, replacement: path.resolve(__dirname, 'deck/back/code/$1') },
      { find: /^@cluesurf\/belt\/(.*)/, replacement: path.resolve(__dirname, 'deck/belt/code/$1') },
      { find: /^@cluesurf\/face\/(.*)/, replacement: path.resolve(__dirname, 'deck/face/code/$1') },
      { find: /^@cluesurf\/site\/(.*)/, replacement: path.resolve(__dirname, 'deck/site/code/$1') },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'deck/back/code/$1') },
    ],
  },
})
