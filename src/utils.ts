import * as recast from "recast";
import { ESNode } from "./types";

export function literalToAst(value: any): ESNode {
  if (Array.isArray(value)) {
    return recast.types.builders.arrayExpression(
      value.map((n) => literalToAst(n)) as any
    ) as any;
  }
  if (typeof value === "object") {
    return recast.types.builders.objectExpression(
      Object.entries(value).map(([key, value]) => {
        return recast.types.builders.property(
          "init",
          recast.types.builders.identifier(key),
          literalToAst(value) as any
        ) as any;
      })
    ) as any;
  }
  return recast.types.builders.literal(value) as any;
}
