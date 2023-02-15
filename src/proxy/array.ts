import { ESNode } from "../types";
import { literalToAst, makeProxyUtils } from "../utils";
import { Proxified } from "./types";
import { proxify } from "./index";

export function proxifyArrayElements<T>(node: ESNode, elements: ESNode[]): Proxified<T> {
  const utils = makeProxyUtils(node, {
    $type: "array",
    push(value: any) {
      elements.push(literalToAst(value) as any);
    },
    pop() {
      return proxify(elements.pop() as any);
    },
    unshift(value: any) {
      elements.unshift(literalToAst(value) as any);
    },
    shift() {
      return proxify(elements.shift() as any);
    },
    toJSON() {
      return elements.map((n) => proxify(n as any));
    },
  });

  const getItem = (key: number) => {
    return elements[key];
  };

  const replaceItem = (key: number, value: ESNode) => {
    elements[key] = value as any;
  };

  const proxy = new Proxy([], {
    get(_, key) {
      if (key in utils) {
        return (utils as any)[key];
      }
      if (key === "length") {
        return elements.length;
      }
      if (typeof key === "symbol") {
        return;
      }
      const prop = getItem(+key);
      if (prop) {
        return proxify(prop);
      }
    },
    set(_, key, value) {
      if (typeof key === "symbol") {
        return false;
      }
      replaceItem(+key, literalToAst(value));
      return true;
    },
    ownKeys() {
      return ["length", ...elements.map((_, i) => i.toString())];
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  }) as any;

  return proxy;
}

export function proxifyArray<T>(node: ESNode): Proxified<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }
  return proxifyArrayElements(node, node.elements as any);
}
