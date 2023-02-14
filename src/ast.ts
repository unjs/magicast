import type { ParsedFileNode, ESNode } from "./types";
import { createNode } from './utils'

export class ModuleNode {
  constructor(public ast: ParsedFileNode) { }

  get exports(): Record<string, GenericNode> {
    const _exports: Record<string, GenericNode> = {};
    for (const n of this.ast.program.body) {
      if (n.type === "ExportNamedDeclaration") {
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id) {
            _exports[dec.id.name] = new GenericNode(n.declaration);
          }
        }
      } else if (n.type === "ExportDefaultDeclaration") {
        _exports.default = new GenericNode(n.declaration);
      }
    }
    return _exports;
  }
}

export class GenericNode {
  constructor(public ast: ESNode) { }

  get type() {
    return this.ast.type;
  }

  get props(): Record<string, GenericNode> {
    if (!("properties" in this.ast)) {
      return {};
    }
    const props = [];
    for (const prop of this.ast.properties) {
      if ("key" in prop && "name" in prop.key) {
        props.push([prop.key.name, new GenericNode(prop.value)]);
      }
    }
    return Object.fromEntries(props);
  }

  get arguments(): GenericNode[] {
    if (!("arguments" in this.ast)) {
      return [];
    }
    return this.ast.arguments.map((arg) => new GenericNode(arg));
  }

  get(key: string) {
    if (!("properties" in this.ast)) {
      return {};
    }
    for (const prop of this.ast.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        return prop;
      }
    }
  }

  push(value: any) {
    if (!("elements" in this.ast)) {
      return {};
    }
    const node = createNode(value);
    this.ast.elements.push(node.ast as any /* ts expects expresion */);
  }
}

