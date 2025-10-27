import type { FunctionExpression } from "@babel/types";
import type {
  ProxifiedFunctionExpression,
  ProxifiedModule,
  ProxifiedBlockStatement,
} from "./types";
import { proxify } from "./proxify";
import { proxifyArrayElements } from "./array";
import { makeProxyUtils } from "./_utils";
import { MagicastError } from "../error";

export function proxifyFunctionExpression(
  node: FunctionExpression,
  mod?: ProxifiedModule,
): ProxifiedFunctionExpression {
  const utils = makeProxyUtils(node, {
    $type: "function-expression",
    $params: proxifyArrayElements(node, node.params, mod),
    $body: proxify(node.body, mod) as ProxifiedBlockStatement,
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
        "Calling proxified functions is not supported. Use `generateCode` to get the code string.",
      );
    },
  }) as unknown as ProxifiedFunctionExpression;
}
