import type {
  ASTNode,
  ProxifiedArrowFunctionExpression,
  ProxifiedModule,
} from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxifyArrayElements } from "./array";
import { proxify } from "./proxify";

export function proxifyArrowFunctionExpression<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule,
): ProxifiedArrowFunctionExpression {
  if (node.type !== "ArrowFunctionExpression") {
    throw new MagicastError("Not an arrow function expression");
  }

  const parametersProxy = proxifyArrayElements<T>(node, node.params, mod);

  return createProxy(
    node,
    {
      $type: "arrow-function-expression",
      $params: parametersProxy,
      $body: proxify(node.body, mod),
    },
    {},
  ) as ProxifiedArrowFunctionExpression;
}
