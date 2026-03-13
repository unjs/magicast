import { createProxy } from "./_utils";
import { ProxifiedUnknownAstNode } from "./types";

export function proxifyUnknownAstNode(node: any) {
  return createProxy(
    node,
    {
      $type: "unknown-ast-node",
    },
    {},
  ) as ProxifiedUnknownAstNode;
}
