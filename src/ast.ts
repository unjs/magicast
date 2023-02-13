import * as recast from "recast";
import type { ParsedFileNode, ESNode } from "./types";

export class ModuleNode {
  constructor(public node: ParsedFileNode) {}

  get exports(): Record<string, GenericNode> {
    const _exports: Record<string, GenericNode> = {};
    for (const n of this.node.program.body) {
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
  constructor(public node: ESNode) {}

  get type() {
    return this.node.type;
  }

  get props(): Record<string, GenericNode> {
    if (!("properties" in this.node)) {
      return {};
    }
    const props = [];
    for (const prop of this.node.properties) {
      if ("key" in prop && "name" in prop.key) {
        props.push([prop.key.name, new GenericNode(prop.value)]);
      }
    }
    return Object.fromEntries(props);
  }

  get arguments(): GenericNode[] {
    if (!("arguments" in this.node)) {
      return [];
    }
    return this.node.arguments.map((arg) => new GenericNode(arg));
  }

  get(key: string) {
    if (!("properties" in this.node)) {
      return {};
    }
    for (const prop of this.node.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        return prop;
      }
    }
  }

  push(value: string | number | boolean | RegExp | bigint | null) {
    if (!("elements" in this.node)) {
      return {};
    }
    const literal = recast.types.builders.literal(value);
    this.node.elements.push(literal as any /* ts expects expresion */);
  }
}
