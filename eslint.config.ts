import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import LINT from '@cluesurf/wash/lint'

// `import.meta.dirname` would be cleaner but requires the newer
// `@types/node` in scope here, and the mesh root tsconfig doesn't
// include this config file. `fileURLToPath` works everywhere.
const __dirname = dirname(fileURLToPath(import.meta.url))

export default [
  ...LINT,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
]
