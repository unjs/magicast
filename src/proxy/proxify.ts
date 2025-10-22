import type { ASTNode } from "../types";
import { MagicastError } from "../error";
import type { Proxified, ProxifiedModule, ProxifiedValue } from "./types";
import { proxifyArray } from "./array";
import { proxifyFunctionCall } from "./function-call";
import { proxifyArrowFunctionExpression } from "./arrow-function-expression";
import { proxifyObject } from "./object";
import { proxifyNewExpression } from "./new-expression";
import { proxifyIdentifier } from "./identifier";
import { proxifyLogicalExpression } from "./logical-expression";
import { proxifyMemberExpression } from "./member-expression";
import { proxifyBinaryExpression } from "./binary-expression";
import { proxifyBlockStatement } from "./block-statement";
import { proxifyFunctionExpression } from "./function-expression";
import { LITERALS_AST, LITERALS_TYPEOF } from "./_utils";

const _cache = new WeakMap<ASTNode, any>();

export function proxify<T>(node: ASTNode, mod?: ProxifiedModule): Proxified<T> {
  if (LITERALS_TYPEOF.has(typeof node)) {
    return node as any;
  }
  if (LITERALS_AST.has(node.type)) {
    return (node as any).value as any;
  }

  if (_cache.has(node)) {
    return _cache.get(node) as Proxified<T>;
  }

  let proxy: ProxifiedValue;
  switch (node.type) {
    case "ObjectExpression": {
      proxy = proxifyObject(node, mod);
      break;
    }
    case "ArrayExpression": {
      proxy = proxifyArray(node, mod);
      break;
    }
    case "CallExpression": {
      proxy = proxifyFunctionCall(node, mod);
      break;
    }
    case "ArrowFunctionExpression": {
      proxy = proxifyArrowFunctionExpression(node, mod);
      break;
    }
    case "FunctionExpression": {
      proxy = proxifyFunctionExpression(node, mod);
      break;
    }
    case "NewExpression": {
      proxy = proxifyNewExpression(node, mod);
      break;
    }
    case "Identifier": {
      proxy = proxifyIdentifier(node);
      break;
    }
    case "LogicalExpression": {
      proxy = proxifyLogicalExpression(node);
      break;
    }
    case "MemberExpression": {
      proxy = proxifyMemberExpression(node);
      break;
    }
    case "BinaryExpression": {
      proxy = proxifyBinaryExpression(node, mod);
      break;
    }
    case "BlockStatement": {
      proxy = proxifyBlockStatement(node, mod);
      break;
    }
    case "TSAsExpression":
    case "TSSatisfiesExpression": {
      proxy = proxify(node.expression, mod) as ProxifiedValue;
      break;
    }
    default: {
      throw new MagicastError(`Casting "${(node as any).type}" is not supported`, {
        ast: node,
        code: mod?.$code,
      });
    }
  }

  _cache.set(node, proxy);
  return proxy as unknown as Proxified<T>;
}
