import { promises as fsp } from "node:fs";
import { print, parse, Options as ParseOptions } from "recast";
import { getBabelParser } from "./babel";
import {
  ASTNode,
  GenerateOptions,
  ParsedFileNode,
  Proxified,
  ProxifiedModule,
} from "./types";
import { proxifyModule } from "./proxy/module";
import { detectCodeFormat } from "./format";
import { proxify } from "./proxy/proxify";

export function parseModule<Exports extends object = any>(
  code: string,
  options?: ParseOptions,
): ProxifiedModule<Exports> {
  const node: ParsedFileNode = parse(code, {
    parser: options?.parser || getBabelParser(),
    ...options,
  });
  return proxifyModule(node, code);
}

export function parseExpression<T>(
  code: string,
  options?: ParseOptions,
): Proxified<T> {
  const root: ParsedFileNode = parse("(" + code + ")", {
    parser: options?.parser || getBabelParser(),
    ...options,
  });
  let body: ASTNode = root.program.body[0];
  if (body.type === "ExpressionStatement") {
    body = body.expression;
  }
  if (body.extra?.parenthesized) {
    body.extra.parenthesized = false;
  }

  const mod = {
    $ast: root,
    $code: " " + code + " ",
    $type: "module",
  } as any as ProxifiedModule;

  return proxify(body, mod);
}

export function generateCode(
  node: { $ast: ASTNode } | ASTNode | ProxifiedModule<any>,
  options: GenerateOptions = {},
): { code: string; map?: any } {
  const ast = (node as Proxified).$ast || node;

  const formatOptions =
    options.format === false || !("$code" in node)
      ? {}
      : detectCodeFormat(node.$code, options.format);

  const { code, map } = print(ast, {
    ...options,
    ...formatOptions,
  });

  return { code, map };
}

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
