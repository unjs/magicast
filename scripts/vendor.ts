/* eslint-disable unicorn/prefer-top-level-await */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { execa } from 'execa'

// This script clones recast and patches, and then re-bundle it so we get rid of the unnecessary polyfills

async function cloneRecast() {
  if (fs.existsSync('vendor/recast')) {
    console.log('vendor/recast already exists')
  }
  else {
    // Clone recast
    await execa('npx', ['tiged', 'benjamn/recast#v0.23.4', 'vendor/recast'], { stdio: 'inherit' })

    // Remove the tsconfig.json so it's targeting newer node versions
    await fsp.rm('vendor/recast/tsconfig.json')

    // Remove the assert import and usage
    await filterLines('vendor/recast/lib/patcher.ts', (line) => {
      if (line.startsWith('import assert from')) {
        return false
      }
      if (/^\s*assert\./.test(line)) {
        return `false && ` + line
      }
      return line
    })
    await filterLines('vendor/recast/lib/patcher.ts', (line) => {
      if (line.startsWith('import assert from')) {
        return false
      }
      if (/^\s*assert\./.test(line)) {
        return `false && ` + line
      }
      return line
    })

    // Remove the require(), and since we are providing our own parser anyway
    await filterLines('vendor/recast/lib/options.ts', (line) => {
      if (line.includes('parser: require("../parsers/esprima")')) {
        return false
      }
      return line
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
    await execa('npx', ['tiged', 'benjamn/ast-types#v0.16.1', 'vendor/ast-types'], { stdio: 'inherit' })

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
