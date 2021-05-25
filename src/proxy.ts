import * as ast from './ast'

export interface ProxifiedNode extends ast.ASTNode {
  exports: Record<string, ProxifiedNode>
  props: Record<string, ProxifiedNode>
  push: (value: string| number | boolean | RegExp) => void
}

export function proxifyNode (node: any) {
  return new Proxy(node, {
    get (_, key: string) {
      // .exports
      if (key === 'exports') {
        const nodeExports: ProxifiedNode['exports'] = {}
        for (const n of node.program.body) {
          if (n.type === 'ExportNamedDeclaration') {
            nodeExports[n.declaration.declarations[0].id] = proxifyNode(n.declaration)
          } else if (n.type === 'ExportDefaultDeclaration') {
            nodeExports.default = proxifyNode(n.declaration)
          }
        }
        return nodeExports
      }

      // .props
      if (key === 'props') {
        return Object.fromEntries(node.properties.map(prop => [prop.key.name, proxifyNode(prop)]))
      }

      // .push
      if (key === 'push') {
        return value => ast.push(node, value)
      }

      // Fallback to node
      return node[key]
    }
  })
}
