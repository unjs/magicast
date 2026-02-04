import * as recast from "recast";
import { proxifyFunctionCall } from "./proxy/function-call";
import { proxifyNewExpression } from "./proxy/new-expression";
import { literalToAst } from "./proxy/_utils";
import type { Proxified } from "./types";
import { parseExpression } from "./core";
import { proxifyBinaryExpression } from "./proxy/binary-expression";

const b = recast.types.builders;

export const builders = {
  /**
   * Create a function call node.
   */
  functionCall(callee: string, ...args: any[]): Proxified {
    const node = b.callExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i) as any),
    );
    return proxifyFunctionCall(node as any);
  },
  /**
   * Create a new expression node.
   */
  newExpression(callee: string, ...args: any[]): Proxified {
    const node = b.newExpression(
      b.identifier(callee),
      args.map((i) => literalToAst(i) as any),
    );
    return proxifyNewExpression(node as any);
  },
  /**
   * Create a binary expression node.
   */
  binaryExpression(
    left: any,
    operator:
      | "=="
      | "!="
      | "==="
      | "!=="
      | "<"
      | "<="
      | ">"
      | ">="
      | "<<"
      | ">>"
      | ">>>"
      | "+"
      | "-"
      | "*"
      | "/"
      | "%"
      | "&"
      | "|"
      | "^"
      | "in"
      | "instanceof"
      | "**",
    right: any,
  ): Proxified {
    const node = b.binaryExpression(
      operator,
      literalToAst(left) as any,
      literalToAst(right) as any,
    );
    return proxifyBinaryExpression(node as any);
  },
  /**
   * Create a proxified version of a literal value.
   */
  literal(value: any): Proxified {
    return literalToAst(value);
  },
  /**
   * Parse a raw expression and return a proxified version of it.
   *
   * ```ts
   * const obj = builders.raw("{ foo: 1 }");
   * console.log(obj.foo); // 1
   * ```
   */
  raw(code: string): Proxified {
    return parseExpression(code);
  },
};
