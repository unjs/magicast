import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      recast: fileURLToPath(new URL('vendor/recast/main.ts', import.meta.url)),
      'ast-types': fileURLToPath(new URL('vendor/ast-types/src/main.ts', import.meta.url)),
      ...(process.env.TEST_BUILD === 'true'
        ? {}
        : {
          'magicast/helpers': fileURLToPath(new URL('src/helpers/index.ts', import.meta.url)),
          magicast: fileURLToPath(new URL('src/index.ts', import.meta.url)),
        }
      )
    }
  },
  test: {
    name: (process.env.TEST_BUILD === 'true' ? 'build' : 'src'),
  }
})
