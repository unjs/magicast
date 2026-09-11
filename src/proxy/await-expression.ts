import type { AwaitExpression } from "@babel/types";
import type { ProxifiedAwaitExpression, ProxifiedModule } from "./types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxify } from "./proxify";

export function proxifyAwaitExpression(
  node: AwaitExpression,
  mod?: ProxifiedModule,
): ProxifiedAwaitExpression {
  if (node.type !== "AwaitExpression") {
    throw new MagicastError("Not an await expression");
  }
  return createProxy(
    node,
    {
      $type: "await-expression",
      $argument: proxify(node.argument, mod),
    },
    {},
  ) as ProxifiedAwaitExpression;
}
