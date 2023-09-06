import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'magicast/helpers': fileURLToPath(new URL('src/helpers/index.ts', import.meta.url)),
      magicast: fileURLToPath(new URL('src/index.ts', import.meta.url)),
    }
  }
})
