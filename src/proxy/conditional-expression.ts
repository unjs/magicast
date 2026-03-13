import type { ConditionalExpression } from "@babel/types";
import { ProxifiedConditionalExpression, ProxifiedModule } from "./types";
import { proxify } from "./proxify";
import { createProxy } from "./_utils";

export function proxifyConditionalExpression(
  node: ConditionalExpression,
  mod?: ProxifiedModule,
): ProxifiedConditionalExpression {
  return createProxy(
    node,
    {
      $type: "conditional-expression",
      $test: proxify(node.test, mod),
      $consequent: proxify(node.consequent, mod),
      $alternate: proxify(node.alternate, mod),
    },
    {},
  ) as ProxifiedConditionalExpression;
}
