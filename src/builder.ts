import * as recast from "recast";
import { AST_KEY, literalToAst } from "./proxy/_utils";

const b = recast.types.builders;

export const builder = {
  functionCall: (callee: string, ...args: any[]) => {
    const node = b.callExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i) as any)
    );
    // @ts-expect-error internal property
    node[AST_KEY] = node;
    return node;
  },
};
