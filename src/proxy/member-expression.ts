import type {
  ASTNode,
  ProxifiedMemberExpression,
  ProxifiedModule,
} from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxify } from "./proxify";

export function proxifyMemberExpression(
  node: ASTNode,
  mod?: ProxifiedModule,
): ProxifiedMemberExpression {
  if (node.type !== "MemberExpression") {
    throw new MagicastError("Not a member expression");
  }

  return createProxy(
    node,
    {
      $type: "member-expression",
      $object: proxify(node.object, mod),
      $property: proxify(node.property, mod),
    },
    {},
  ) as ProxifiedMemberExpression;
}
