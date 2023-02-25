/* eslint-disable unicorn/no-nested-ternary */
import { ParsedFileNode } from "../types";
import { MagicastError } from "../error";
import { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";

export function proxifyModule<T>(
  ast: ParsedFileNode,
  code: string
): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new MagicastError(`Cannot proxify ${ast.type} as module`);
  }

  const mod = {
    $ast: root,
    $code: code,
    $type: "module",
  } as any;

  mod.exports = createExportsProxy(root, mod);
  mod.imports = createImportsProxy(root, mod);

  return mod as ProxifiedModule<T>;
}
