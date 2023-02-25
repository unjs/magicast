import { ESNode } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
import { proxifyArrayElements } from "./array";
import { Proxified, ProxifiedModule } from "./types";

export function proxifyFunctionCall<T>(
  node: ESNode,
  mod?: ProxifiedModule
): Proxified<T> {
  if (node.type !== "CallExpression") {
    throw new MagicastError("Not a function call");
  }

  function stringifyExpression(node: ESNode): string {
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

  const argumentsProxy = proxifyArrayElements(node, node.arguments as any, mod);

  return createProxy(
    node,
    {
      $type: "function-call",
      $callee: stringifyExpression(node.callee as any),
      $args: argumentsProxy,
    },
    {}
  ) as any;
}
