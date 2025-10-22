import type { BinaryExpression } from "@babel/types";
import type { ProxifiedBinaryExpression, ProxifiedModule } from "./types";
import { proxify } from "./proxify";

export function proxifyBinaryExpression(
  node: BinaryExpression,
  mod?: ProxifiedModule,
): ProxifiedBinaryExpression {
  return {
    $type: "binaryExpression",
    $ast: node,
    left: proxify(node.left, mod),
    right: proxify(node.right, mod),
    operator: node.operator,
  };
}
