import type { ASTNode, ProxifiedIdentifier } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";

export function proxifyIdentifier(node: ASTNode): ProxifiedIdentifier {
  if (node.type !== "Identifier") {
    throw new MagicastError("Not an identifier");
  }

  return createProxy(
    node,
    {
      $type: "identifier",
      $name: node.name,
    },
    {}
  ) as ProxifiedIdentifier;
}
