import { ESNode } from "../types";
import { literalToAst, createProxy, proxify } from "./_utils";
import { Proxified } from "./types";

export function proxifyArrayElements<T extends object>(
  node: ESNode,
  elements: ESNode[]
): Proxified<T> {
  const getItem = (key: number) => {
    return elements[key];
  };

  const replaceItem = (key: number, value: ESNode) => {
    elements[key] = value as any;
  };

  return createProxy<T>(node, {
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
  }, {
    get(_, key) {
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
  });
}

export function proxifyArray<T extends object>(node: ESNode): Proxified<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }
  return proxifyArrayElements(node, node.elements as any);
}
