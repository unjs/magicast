/* eslint-disable unicorn/no-nested-ternary */
import { ParsedFileNode } from "../types";
import { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";

export function proxifyModule<T>(ast: ParsedFileNode): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new Error(`Cannot proxify ${ast.type} as module`);
  }

  return {
    $ast: root,
    $type: "module",
    exports: createExportsProxy(root),
    imports: createImportsProxy(root),
  } as any;
}
