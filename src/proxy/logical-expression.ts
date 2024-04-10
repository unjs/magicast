import type { ASTNode, ProxifiedLogicalExpression } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";

export function proxifyLogicalExpression(
  node: ASTNode,
): ProxifiedLogicalExpression {
  if (node.type !== "LogicalExpression") {
    throw new MagicastError("Not a logical expression");
  }

  return createProxy(
    node,
    {
      $type: "logicalExpression",
    },
    {},
  ) as ProxifiedLogicalExpression;
}
