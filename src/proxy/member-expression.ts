import type { ASTNode, ProxifiedMemberExpression } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";

export function proxifyMemberExpression(
  node: ASTNode,
): ProxifiedMemberExpression {
  if (node.type !== "MemberExpression") {
    throw new MagicastError("Not a member expression");
  }

  return createProxy(
    node,
    {
      $type: "memberExpression",
    },
    {},
  ) as ProxifiedMemberExpression;
}
