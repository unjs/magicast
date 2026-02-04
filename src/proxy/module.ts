import type { ParsedFileNode } from "../types";
import { MagicastError } from "../error";
import { generateCode } from "../core";
import type { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";
import { createProxy } from "./_utils";

export function proxifyModule<T extends object>(
  ast: ParsedFileNode,
  code: string,
): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new MagicastError(`Cannot proxify ${ast.type} as module`);
  }

  const util = {
    $code: code,
    $type: "module",
  } as ProxifiedModule<T>;

  const mod = createProxy(root, util, {
    ownKeys() {
      return ["imports", "exports", "generate"];
    },
  }) as ProxifiedModule<T>;

  util.exports = createExportsProxy(root, mod) as any;
  util.imports = createImportsProxy(root, mod) as any;
  util.generate = (options) => generateCode(mod, options);

  return mod;
}
