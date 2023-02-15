import { ESNode } from "../types";
import { makeProxyUtils } from "./_utils";
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

  return makeProxyUtils(node, {
    $type: "function-call",
    name: stringifyExpression(node.callee as any),
    arguments: argumentsProxy,
  }) as any;
}
