import type { BlockStatement } from "@babel/types";
import type { ProxifiedBlockStatement, ProxifiedModule } from "./types";
import { proxifyArrayElements } from "./array";

export function proxifyBlockStatement(
  node: BlockStatement,
  mod?: ProxifiedModule
): ProxifiedBlockStatement {
  return {
    $type: "blockStatement",
    $ast: node,
    $body: proxifyArrayElements(node, node.body, mod),
  };
}
