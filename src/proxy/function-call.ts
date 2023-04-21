import type { ASTNode } from "../types";
import type { ProxifiedFunctionCall, ProxifiedModule } from "./types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxifyArrayElements } from "./array";

export function proxifyFunctionCall<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule
): ProxifiedFunctionCall<T> {
  if (node.type !== "CallExpression") {
    throw new MagicastError("Not a function call");
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
      $type: "function-call",
      $callee: stringifyExpression(node.callee as any),
      $args: argumentsProxy,
    },
    {}
  ) as ProxifiedFunctionCall<T>;
}
