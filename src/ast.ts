import { proxify, Proxified } from "./proxy";
import type { ParsedFileNode } from "./types";

export class ModuleNode {
  constructor(public node: ParsedFileNode) {}

  get exports(): Record<string, Proxified> {
    const _exports: Record<string, Proxified> = {};
    for (const n of this.node.program.body) {
      if (n.type === "ExportNamedDeclaration") {
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id) {
            _exports[dec.id.name] = proxify(n.declaration);
          }
        }
      } else if (n.type === "ExportDefaultDeclaration") {
        _exports.default = proxify(n.declaration);
      }
    }
    return _exports;
  }

  get imports(): unknown[] {
    throw new Error("Not implemented");
  }
}
