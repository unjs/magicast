import type { FunctionExpression } from "@babel/types";
import type { ProxifiedFunctionExpression, ProxifiedModule, ProxifiedBlockStatement } from "./types";
import { proxify } from "./proxify";
import { proxifyArrayElements } from "./array";

export function proxifyFunctionExpression(
  node: FunctionExpression,
  mod?: ProxifiedModule
): ProxifiedFunctionExpression {
  return {
    $type: "function-expression",
    $ast: node,
    $params: proxifyArrayElements(node, node.params, mod),
    $body: proxify(node.body, mod) as ProxifiedBlockStatement,
  };
}
