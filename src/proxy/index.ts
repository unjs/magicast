import type { ESNode } from "../types";
import { proxifyArray } from "./array";
import { proxifyFunctionCall } from "./function-call";
import { proxifyObject } from "./object";
import { Proxified } from "./types";
export * from "./types";

const literalTypes = new Set([
  "Literal",
  "StringLiteral",
  "NumericLiteral",
  "BooleanLiteral",
  "NullLiteral",
  "RegExpLiteral",
  "BigIntLiteral",
]);

const literals = new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined",
]);

export function proxify<T>(node: ESNode): Proxified<T> {
  if (literals.has(typeof node)) {
    return node as any;
  }
  if (literalTypes.has(node.type)) {
    return (node as any).value as any;
  }
  if (node.type === "ObjectExpression") {
    return proxifyObject<T>(node);
  }
  if (node.type === "ArrayExpression") {
    return proxifyArray<T>(node);
  }
  if (node.type === "CallExpression") {
    return proxifyFunctionCall(node);
  }
  throw new Error(`Cannot proxify ${node.type}`);
}
