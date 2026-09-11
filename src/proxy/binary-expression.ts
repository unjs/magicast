import type { BinaryExpression } from "@babel/types";
import type { ProxifiedBinaryExpression, ProxifiedModule } from "./types";
import { createProxy } from "./_utils";
import { proxify } from "./proxify";

export function proxifyBinaryExpression(
  node: BinaryExpression,
  mod?: ProxifiedModule,
): ProxifiedBinaryExpression {
  return createProxy(
    node,
    {
      $type: "binary-expression",
      $left: proxify(node.left, mod),
      $right: proxify(node.right, mod),
      $operator: node.operator,
    },
    {},
  ) as ProxifiedBinaryExpression;
}
