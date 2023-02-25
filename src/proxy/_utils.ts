import * as recast from "recast";
import { MagicastError } from "../error";
import type { ESNode } from "../types";
import { ProxyUtils, Proxified } from "./types";

const b = recast.types.builders;

export function isValidPropName(name: string) {
  return /^[$A-Z_a-z][\w$]*$/.test(name);
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
