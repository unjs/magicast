import fs, { promises as fsp } from 'fs'
import { parse, generate, ASTNode, ASTOptions } from './ast'
import { ProxifiedNode, proxifyAST } from './proxy'

export async function load (filename: string, options: ASTOptions = {}): Promise<ProxifiedNode> {
  const contents = await fsp.readFile(filename, 'utf8')
  options.sourceFileName = filename
  return proxifyAST(parse(contents, options))
}

export function loadSync (filename: string, options: ASTOptions = {}): ProxifiedNode {
  const contents = fs.readFileSync(filename, 'utf8')
  options.sourceFileName = filename
  return proxifyAST(parse(contents, options))
}

export async function write (node: ASTNode, filename?: string, options?: ASTOptions): Promise<void> {
  filename = filename || (node.type === 'file' && node.name) || 'output.js'
  const { code, map } = generate(node, options)
  await fsp.writeFile(filename, code)
  if (map) {
    await fsp.writeFile(filename + '.map', map)
  }
}

export function writeSync (node: ASTNode, filename?: string): void {
  filename = filename || (node.type === 'file' && node.name) || 'output.js'
  const { code, map } = generate(node)
  fs.writeFileSync(filename, code)
  if (map) {
    fs.writeFileSync(filename + '.map', map)
  }
}
