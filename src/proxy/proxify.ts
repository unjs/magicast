import { MagicastError } from "../error";
import { ESNode } from "../types";
import { proxifyArray } from "./array";
import { proxifyFunctionCall } from "./function-call";
import { proxifyObject } from "./object";
import { Proxified, ProxifiedModule } from "./types";

const _literalTypes = new Set([
  "Literal",
  "StringLiteral",
  "NumericLiteral",
  "BooleanLiteral",
  "NullLiteral",
  "RegExpLiteral",
  "BigIntLiteral",
]);

const _literals = new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined",
]);

const _cache = new WeakMap<ESNode, Proxified<any>>();

export function proxify<T>(node: ESNode, mod?: ProxifiedModule): Proxified<T> {
  if (_literals.has(typeof node)) {
    return node as any;
  }
  if (_literalTypes.has(node.type)) {
    return (node as any).value as any;
  }

  if (_cache.has(node)) {
    return _cache.get(node) as Proxified<T>;
  }

  let proxy: Proxified<T>;
  switch (node.type) {
    case "ObjectExpression": {
      proxy = proxifyObject<T>(node, mod);
      break;
    }
    case "ArrayExpression": {
      proxy = proxifyArray<T>(node, mod);
      break;
    }
    case "CallExpression": {
      proxy = proxifyFunctionCall(node, mod);
      break;
    }
    default:
      throw new MagicastError(`Casting "${node.type}" is not supported`, {
        ast: node,
        code: mod?.$code,
      });
  }

  _cache.set(node, proxy);
  return proxy;
}
