import * as recast from "recast";
import { ProxyUtils } from "./proxy/types";
import type { ESNode } from "./types";

const PROXY_KEY = "__paneer_proxy";

export function literalToAst(value: any): ESNode {
  if (value[PROXY_KEY]) {
    return value.$ast;
  }
  if (Array.isArray(value)) {
    return recast.types.builders.arrayExpression(
      value.map((n) => literalToAst(n)) as any
    ) as any;
  }
  if (typeof value === "object") {
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
  return {
    [PROXY_KEY]: true,
    get $ast() {
      return node;
    },
    $type: "object",
    ...extend,
  } as ProxyUtils & T;
}
