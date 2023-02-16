import * as recast from "recast";
import type { ESNode } from "../types";
import { proxifyArray } from "./array";
import { proxifyFunctionCall } from "./function-call";
import { proxifyObject } from "./object";
import { ProxyUtils, Proxified } from "./types";

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

export function proxify<T>(node: ESNode): Proxified<T> {
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
      proxy = proxifyObject<T>(node);
      break;
    }
    case "ArrayExpression": {
      proxy = proxifyArray<T>(node);
      break;
    }
    case "CallExpression": {
      proxy = proxifyFunctionCall(node);
      break;
    }
    default:
      throw new Error(`Cannot proxify ${node.type}`);
  }

  _cache.set(node, proxy);
  return proxy;
}

const PROXY_KEY = "__magicast_proxy";

export function literalToAst(value: any): ESNode {
  if (value === undefined) {
    return recast.types.builders.identifier("undefined") as any;
  }
  if (value === null) {
    // eslint-disable-next-line unicorn/no-null
    return recast.types.builders.literal(null) as any;
  }
  if (Array.isArray(value)) {
    return recast.types.builders.arrayExpression(
      value.map((n) => literalToAst(n)) as any
    ) as any;
  }
  if (typeof value === "object") {
    if (PROXY_KEY in value) {
      return value.$ast;
    }
    return recast.types.builders.objectExpression(
      Object.entries(value).map(([key, value]) => {
        return recast.types.builders.property(
          "init",
          recast.types.builders.identifier(key),
          literalToAst(value) as any
        ) as any;
      })
    ) as any;
  }
  return recast.types.builders.literal(value) as any;
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
