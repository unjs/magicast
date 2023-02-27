/* eslint-disable unicorn/no-nested-ternary */
import { ParsedFileNode } from "../types";
import { MagicastError } from "../error";
import { generateCode } from "../code";
import { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";

export function proxifyModule<T extends object>(
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
  } as ProxifiedModule<T>;

  mod.exports = createExportsProxy(root, mod) as any;
  mod.imports = createImportsProxy(root, mod) as any;
  mod.generate = (options) => generateCode(mod, options);

  return mod;
}
