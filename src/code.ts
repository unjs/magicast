import { print, parse, Options as ParseOptions, types } from "recast";
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
import { makeProxyUtils } from "./proxy/_utils";

const b = types.builders;

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
  // Wrapping a standalone comment in "()" makes Babel's parser interpret "/" in
  // expression position as a regex literal, causing a SyntaxError. Detect this
  // case and prepend `null` so the comment is parsed as a trailing remark on a
  // null literal instead.
  const isStandaloneComment =
    /^\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n\r\u2028\u2029]*)\s*$/.test(code);

  const parseCode = isStandaloneComment ? code + "\nnull" : "(" + code + ")";

  const root: ParsedFileNode = parse(parseCode, {
    parser: options?.parser || getBabelParser(),
    ...options,
  });
  let body: ASTNode = root.program.body[0];
  if (body.type === "ExpressionStatement") {
    const expr = (body as any).expression;
    if (isStandaloneComment && (body as any).comments?.length) {
      // Transfer comments from ExpressionStatement to the expression node so
      // they survive when the node is embedded into another AST.
      expr.comments = (body as any).comments;
      delete (body as any).comments;
    }
    body = expr;
  }
  if ((body as any).extra?.parenthesized) {
    (body as any).extra.parenthesized = false;
  }

  if (isStandaloneComment) {
    // proxify() for NullLiteral returns JS `undefined` (NullLiteral has no
    // .value in Babel's AST), which loses the comment. Return a proxy with
    // $ast pointing to the expression directly so that literalToAst() emits
    // it — including the attached comment — when the node is inserted.
    return makeProxyUtils(body, {
      $type: "comment",
    }) as unknown as Proxified<T>;
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
  let ast = (node as Proxified).$ast || node;

  if (ast.type === "FunctionExpression") {
    ast = b.expressionStatement(ast);
  }

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
