import { ESNode } from "../types";
import { createProxy } from "./_utils";
import { proxifyArrayElements } from "./array";
import { Proxified } from "./types";

export function proxifyFunctionCall<T>(node: ESNode): Proxified<T> {
  if (node.type !== "CallExpression") {
    throw new Error("Not a function call");
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
    throw new Error("Not implemented");
  }

  const argumentsProxy = proxifyArrayElements(node, node.arguments as any);

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
