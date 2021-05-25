import * as recast from 'recast'
import { ProxifiedNode, proxifyNode } from './proxy'

export interface ASTOptions extends Partial<recast.Options> {}

export interface ASTLoc {
  start?: { line?: number, column?: number, token?: number }
  end?: { line?: number, column?: number, token?: number }
  lines: any[]
}

export interface ASTNode {
  filename?: string
  program?: {
    type?: string
    body?: ASTNode[]
    sourceType?: string
    loc?: ASTLoc
    errors: any[]
  }
  name?: string
  loc: ASTLoc
  type: string
  comments?: any
  tokens: any[]
  [key: string]: any
}

export function parse (code: string, options?: ASTOptions): ProxifiedNode {
  return recast.parse(code, options)
}

export function generate (node: ASTNode, options?: ASTOptions): { code: string, map?: any } {
  const { code, map } = recast.print(node, options)
  return { code, map }
}

export function defaultExport (node: ASTNode): ASTNode {
  return node.program.body.find(n => n.type === 'ExportDefaultDeclaration')?.declaration
}

export function get (node: ASTNode, key: string): ASTNode {
  return node.properties.find(prop => prop.key.name === key)
}

export function push (node: ASTNode, value: string| number | boolean | RegExp): ASTNode {
  node.value.elements.push(recast.types.builders.literal(value))
  return node
}
