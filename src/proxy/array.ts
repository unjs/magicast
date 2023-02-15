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

  return createProxy(
    node,
    {
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
      splice(start: number, deleteCount: number, ...items: any[]) {
        const deleted = elements.splice(
          start,
          deleteCount,
          ...items.map(n => literalToAst(n))
        );
        return deleted.map(n => proxify(n as any));
      },
      find(predicate: (value: any, index: number, arr: any[]) => boolean) {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        return elements.map((n) => proxify(n as any)).find(predicate);
      },
      findIndex(predicate: (value: any, index: number, arr: any[]) => boolean) {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        return elements.map((n) => proxify(n as any)).findIndex(predicate);
      },
      includes (value: any) {
        return elements.map((n) => proxify(n as any)).includes(value);
      },
      toJSON() {
        return elements.map((n) => proxify(n as any));
      },
    },
    {
      get(_, key) {
        if (key === "length") {
          return elements.length;
        }
        if (typeof key === "symbol") {
          return;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return;
        }
        const prop = getItem(index);
        if (prop) {
          return proxify(prop);
        }
      },
      set(_, key, value) {
        if (typeof key === "symbol") {
          return false;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return false;
        }
        replaceItem(index, literalToAst(value));
        return true;
      },
      deleteProperty(_, key) {
        if (typeof key === "symbol") {
          return false;
        }
        const index = +key;
        if (Number.isNaN(index)) {
          return false;
        }
        elements[index] = literalToAst(undefined);
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
    }
  );
}

export function proxifyArray<T>(node: ESNode): Proxified<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }
  return proxifyArrayElements(node, node.elements as any) as any;
}
