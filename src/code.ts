import { promises as fsp } from "node:fs";
import { print, parse, Options as ParseOptions } from "recast";
import { getBabelParser } from "./babel";
import { ESNode, ParsedFileNode, ProxifiedModule } from "./types";
import { proxifyModule } from "./proxy/module";

export function parseCode<T = any>(
  code: string,
  options?: ParseOptions
): ProxifiedModule<T> {
  const node: ParsedFileNode = parse(code, {
    parser: options?.parser || getBabelParser(),
    ...options,
  });
  return proxifyModule(node);
}

export function generateCode(
  node: { $ast: ESNode } | ESNode,
  options?: ParseOptions
): { code: string; map?: any } {
  const ast = "$ast" in node ? node.$ast : node;
  const { code, map } = print(ast, {
    ...options,
  });
  return { code, map };
}

export async function loadFile<T = any>(
  filename: string,
  options: ParseOptions = {}
): Promise<ProxifiedModule<T>> {
  const contents = await fsp.readFile(filename, "utf8");
  options.sourceFileName = options.sourceFileName ?? filename;
  return parseCode(contents, options);
}

export async function writeFile(
  node: { ast: ESNode } | ESNode,
  filename?: string,
  options?: ParseOptions
): Promise<void> {
  const ast = "ast" in node ? node.ast : node;
  const { code, map } = generateCode(ast, options);
  filename = filename || (ast as any).name || "output.js";
  await fsp.writeFile(filename as string, code);
  if (map) {
    await fsp.writeFile(filename + ".map", map);
  }
}
