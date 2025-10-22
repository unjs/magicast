import type {
  ASTNode,
  ProxifiedArrowFunctionExpression,
  ProxifiedModule,
} from "../types";
import { MagicastError } from "../error";
import { makeProxyUtils } from "./_utils";
import { proxifyArrayElements } from "./array";
import { proxify } from "./proxify";

export function proxifyArrowFunctionExpression<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule,
): ProxifiedArrowFunctionExpression {
  if (node.type !== "ArrowFunctionExpression") {
    throw new MagicastError("Not an arrow function expression");
  }

  const utils = makeProxyUtils(node, {
    $type: "arrow-function-expression",
    $params: proxifyArrayElements<T>(node, node.params, mod),
    $body: proxify(node.body, mod),
  });

  return new Proxy(() => {}, {
    get(target, key, receiver) {
      if (key in utils) {
        return (utils as any)[key];
      }
      return Reflect.get(target, key, receiver);
    },
    apply() {
      throw new MagicastError(
        "Calling proxified functions is not supported. Use `generateCode` to get the code string."
      );
    },
  }) as unknown as ProxifiedArrowFunctionExpression;
}
