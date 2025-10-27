import type { BlockStatement } from "@babel/types";
import type { ProxifiedBlockStatement, ProxifiedModule } from "./types";
import { proxifyArrayElements } from "./array";
import { createProxy } from "./_utils";

export function proxifyBlockStatement(
  node: BlockStatement,
  mod?: ProxifiedModule,
): ProxifiedBlockStatement {
  return createProxy(
    node,
    {
      $type: "block-statement",
      $body: proxifyArrayElements(node, node.body, mod),
    },
    {},
  ) as ProxifiedBlockStatement;
}
