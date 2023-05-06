import type { ASTNode } from "../types";
import type { ProxifiedArray, ProxifiedModule } from "./types";
import { literalToAst, createProxy } from "./_utils";
import { proxify } from "./proxify";

export function proxifyArrayElements<T extends any[]>(
  node: ASTNode,
  elements: ASTNode[],
  mod?: ProxifiedModule
): ProxifiedArray<T> {
  const getItem = (key: number) => {
    return elements[key];
  };

  const replaceItem = (key: number, value: ASTNode) => {
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
        return proxify(elements.pop() as any, mod);
      },
      unshift(value: any) {
        elements.unshift(literalToAst(value) as any);
      },
      shift() {
        return proxify(elements.shift() as any, mod);
      },
      splice(start: number, deleteCount: number, ...items: any[]) {
        const deleted = elements.splice(
          start,
          deleteCount,
          ...items.map((n) => literalToAst(n))
        );
        return deleted.map((n) => proxify(n as any, mod));
      },
      find(predicate: (value: any, index: number, arr: any[]) => boolean) {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        return elements.map((n) => proxify(n as any, mod)).find(predicate);
      },
      findIndex(predicate: (value: any, index: number, arr: any[]) => boolean) {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        return elements.map((n) => proxify(n as any, mod)).findIndex(predicate);
      },
      includes(value: any) {
        return elements.map((n) => proxify(n as any, mod)).includes(value);
      },
      toJSON() {
        return elements.map((n) => proxify(n as any, mod));
      },
    },
    {
      get(_, key) {
        if (key === "length") {
          return elements.length;
        }
        if (key === Symbol.iterator) {
          return function* () {
            for (const item of elements) {
              yield proxify(item as any, mod);
            }
          };
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
          return proxify(prop, mod);
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
    }
  );
}

export function proxifyArray<T extends any[]>(
  node: ASTNode,
  mod?: ProxifiedModule
): ProxifiedArray<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }
  return proxifyArrayElements(node, node.elements as any, mod) as any;
}
