import * as recast from "recast";
import { proxifyFunctionCall } from "./proxy/function-call";
import { literalToAst } from "./proxy/_utils";
import { Proxified } from "./types";

const b = recast.types.builders;

export const builder = {
  functionCall(callee: string, ...args: any[]): Proxified {
    const node = b.callExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i) as any)
    );
    return proxifyFunctionCall(node as any);
  },
  literal(value: any): Proxified {
    return literalToAst(value);
  },
};
