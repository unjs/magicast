import { promises as fsp } from "node:fs";
import { print, parse, Options as ParseOptions } from "recast";
import { ModuleNode } from "./ast";
import { getBabelParser } from "./babel";
import { ParsedFileNode } from "./types";

export function parseCode(code: string, options?: ParseOptions): ModuleNode {
  const node: ParsedFileNode = parse(code, {
    parser: options?.parser || getBabelParser(),
    ...options,
  });
  return new ModuleNode(node);
}

export function generateCode(
  module: ModuleNode,
  options?: ParseOptions
): { code: string; map?: any } {
  const { code, map } = print(module.node, {
    ...options,
  });
  return { code, map };
}

export async function loadFile(
  filename: string,
  options: ParseOptions = {}
): Promise<ModuleNode> {
  const contents = await fsp.readFile(filename, "utf8");
  options.sourceFileName = options.sourceFileName ?? filename;
  return parseCode(contents, options);
}

export async function writeFile(
  node: ModuleNode,
  filename?: string,
  options?: ParseOptions
): Promise<void> {
  const { code, map } = generateCode(node, options);
  filename = filename || node.node.name || "output.js";
  await fsp.writeFile(filename, code);
  if (map) {
    await fsp.writeFile(filename + ".map", map);
  }
}
