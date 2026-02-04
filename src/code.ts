import { promises as fsp } from "node:fs";
import type { Options as ParseOptions } from "recast";
import { generateCode, parseModule } from "./core";
import type { ASTNode, ProxifiedModule } from "./types";

export async function loadFile<Exports extends object = any>(
  filename: string,
  options: ParseOptions = {},
): Promise<ProxifiedModule<Exports>> {
  const contents = await fsp.readFile(filename, "utf8");
  options.sourceFileName = options.sourceFileName ?? filename;
  return parseModule(contents, options);
}

export async function writeFile(
  node: { $ast: ASTNode } | ASTNode,
  filename: string,
  options?: ParseOptions,
): Promise<void> {
  const ast = "$ast" in node ? node.$ast : node;
  const { code, map } = generateCode(ast, options);
  await fsp.writeFile(filename as string, code);
  if (map) {
    await fsp.writeFile(filename + ".map", map);
  }
}
