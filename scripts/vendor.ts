/* eslint-disable unicorn/prefer-top-level-await */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { join } from 'node:path'
import { downloadTemplate } from 'giget'

// This script clones recast and patches, and then re-bundle it so we get rid of the unnecessary polyfills

async function cloneRecast() {
  if (fs.existsSync('vendor/recast')) {
    console.log('vendor/recast already exists')
  }
  else {
    // Clone recast
    await downloadTemplate('github:benjamn/recast#v0.23.4', {
      dir: 'vendor/recast',
    })

    // Remove the tsconfig.json so it's targeting newer node versions
    await fsp.rm('vendor/recast/tsconfig.json')

    // Remove the assert import and usage
    await Promise.all(fs.readdirSync('vendor/recast/lib', { withFileTypes: true }).map(async (file) => {
      if (!file.isFile()) {
        return
      }
      return await filterLines(join(file.path, file.name), (line) => {
        if (line.startsWith('import assert from')) {
          return false
        }
        if (/^\s*assert\./.test(line)) {
          if (line.endsWith(';')) {
            return false
          }
          return `// @ts-ignore \n false && ` + line
        }
        return line
      })
    }))

    // Remove the require(), and since we are providing our own parser anyway
    await filterLines('vendor/recast/lib/options.ts', (line) => {
      if (line.includes('parser: require("../parsers/esprima")')) {
        return false
      }
      return line
    })

    await filterLines('vendor/recast/lib/parser.ts', (line) => {
      return line.replace('require("esprima")', `false && require("")`)
    })

    await filterLines('vendor/recast/lib/util.ts', (line) => {
      if (line.includes('isBrowser() ? "\\n"')) { return 'return "\\n"' }
      return line
    })

    console.log('vendor/recast cloned')
  }
}


async function cloneAstTypes() {
  if (fs.existsSync('vendor/ast-types')) {
    console.log('vendor/ast-types already exists')
  }
  else {
    // Clone recast
    await downloadTemplate('github:benjamn/ast-types#v0.16.1', {
      dir: 'vendor/ast-types',
    })

    // Remove the tsconfig.json so it's targeting newer node versions
    await fsp.rm('vendor/ast-types/tsconfig.json')

    // Add import type
    await filterLines('vendor/ast-types/src/main.ts', (line) => {
      if (/^import\s*{\s*(ASTNode|Visitor)/.test(line)) {
        return line.replace(/^import /, 'import type ')
      }
      return line
    })

    console.log('vendor/ast-types cloned')
  }
}

async function filterLines(file: string, filter: (line: string, index: number) => boolean | string) {
  const content = await fsp.readFile(file, 'utf8')
  const lines = content.split('\n')
  const newContent = lines
    .map((i, idx) => filter(i, idx))
    .filter(i => i !== false)
    .join('\n')
  if (newContent !== content) {
    await fsp.writeFile(file, newContent)
  }
}


await Promise.all([
  cloneRecast(),
  cloneAstTypes(),
])
