import { ASTNode } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxifyArrayElements } from "./array";
import { ProxifiedModule, ProxifiedNewExpression } from "./types";

export function proxifyNewExpression<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule
): ProxifiedNewExpression<T> {
  if (node.type !== "NewExpression") {
    throw new MagicastError("Not a new expression");
  }

  function stringifyExpression(node: ASTNode): string {
    if (node.type === "Identifier") {
      return node.name;
    }
    if (node.type === "MemberExpression") {
      return `${stringifyExpression(node.object)}.${stringifyExpression(
        node.property
      )}`;
    }
    throw new MagicastError("Not implemented");
  }

  const argumentsProxy = proxifyArrayElements<T>(node, node.arguments, mod);

  return createProxy(
    node,
    {
      $type: "new-expression",
      $callee: stringifyExpression(node.callee as any),
      $args: argumentsProxy,
    },
    {}
  ) as ProxifiedNewExpression<T>;
}
