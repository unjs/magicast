import * as recast from "recast";
import { MagicastError } from "../error";
import type { ESNode } from "../types";
import { proxifyArray } from "./array";
import { proxifyFunctionCall } from "./function-call";
import { proxifyObject } from "./object";
import { ProxyUtils, Proxified, ProxifiedModule } from "./types";

const b = recast.types.builders;

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

const _cache = new WeakMap<ESNode, Proxified<any>>();

export function isValidPropName(name: string) {
  return /^[$A-Z_a-z][\w$]*$/.test(name);
}

export function proxify<T>(node: ESNode, mod?: ProxifiedModule): Proxified<T> {
  if (literals.has(typeof node)) {
    return node as any;
  }
  if (literalTypes.has(node.type)) {
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

const PROXY_KEY = "__magicast_proxy";

export function literalToAst(value: any, seen = new Set()): ESNode {
  if (value === undefined) {
    return b.identifier("undefined") as any;
  }
  if (value === null) {
    // eslint-disable-next-line unicorn/no-null
    return b.literal(null) as any;
  }
  if (seen.has(value)) {
    throw new MagicastError("Can not serialize circular reference");
  }
  seen.add(value);
  if (value instanceof Set) {
    return b.newExpression(b.identifier("Set"), [
      b.arrayExpression([...value].map((n) => literalToAst(n, seen)) as any),
    ]) as any;
  }
  if (value instanceof Date) {
    return b.newExpression(b.identifier("Date"), [
      b.literal(value.toISOString()),
    ]) as any;
  }
  if (value instanceof Map) {
    return b.newExpression(b.identifier("Map"), [
      b.arrayExpression(
        [...value].map(([key, value]) => {
          return b.arrayExpression([
            literalToAst(key, seen) as any,
            literalToAst(value, seen) as any,
          ]) as any;
        }) as any
      ),
    ]) as any;
  }
  if (Array.isArray(value)) {
    return b.arrayExpression(
      value.map((n) => literalToAst(n, seen)) as any
    ) as any;
  }
  if (typeof value === "object") {
    if (PROXY_KEY in value) {
      return value.$ast;
    }
    return b.objectExpression(
      Object.entries(value).map(([key, value]) => {
        return b.property(
          "init",
          b.identifier(key),
          literalToAst(value, seen) as any
        ) as any;
      })
    ) as any;
  }
  return b.literal(value) as any;
}

export function makeProxyUtils<T extends object>(
  node: ESNode,
  extend: T = {} as T
): ProxyUtils & T {
  const obj = extend as ProxyUtils & T;
  // @ts-expect-error internal property
  obj[PROXY_KEY] = true;
  obj.$ast = node;
  obj.$type ||= "object";
  return obj;
}

export function createProxy<T extends object>(
  node: ESNode,
  extend: any,
  handler: ProxyHandler<T>
): Proxified<T> {
  const utils = makeProxyUtils(node, extend);
  return new Proxy(
    {},
    {
      ...handler,
      get(target: T, key: string | symbol, receiver: any) {
        if (key in utils) {
          return (utils as any)[key];
        }
        if (handler.get) {
          return handler.get(target, key, receiver);
        }
      },
      set(target: T, key: string | symbol, value: any, receiver: any) {
        if (key in utils) {
          (utils as any)[key] = value;
          return true;
        }
        if (handler.set) {
          return handler.set(target, key, value, receiver);
        }
        return false;
      },
    }
  ) as Proxified<T>;
}
