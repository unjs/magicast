import type { ASTNode } from "../types";
import type { ProxifiedArray, ProxifiedModule } from "./types";
import { literalToAst, makeProxyUtils } from "./_utils";
import { proxify } from "./proxify";

export function proxifyArrayElements<T extends any[]>(
  node: ASTNode,
  elements: ASTNode[],
  mod?: ProxifiedModule,
): ProxifiedArray<T> {
  const utils = makeProxyUtils(node, {
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
        ...items.map((n) => literalToAst(n)),
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
  });

  return new Proxy([], {
    get(target, key, receiver) {
      if (key in utils) {
        return (utils as any)[key];
      }
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
        return Reflect.get(target, key, receiver);
      }
      const index = +key;
      if (!Number.isNaN(index)) {
        const prop = elements[index];
        if (prop) {
          return proxify(prop, mod);
        }
      }
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      if (typeof key === "symbol") {
        return Reflect.set(target, key, value, receiver);
      }
      const index = +key;
      if (!Number.isNaN(index)) {
        elements[index] = literalToAst(value);
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
    deleteProperty(target, key) {
      if (typeof key === "symbol") {
        return Reflect.deleteProperty(target, key);
      }
      const index = +key;
      if (!Number.isNaN(index)) {
        elements[index] = literalToAst(undefined);
        return true;
      }
      return Reflect.deleteProperty(target, key);
    },
    ownKeys() {
      return ["length", ...elements.map((_, i) => i.toString())];
    },
    getOwnPropertyDescriptor(target, key) {
      if (key in utils) {
        return {
          configurable: true,
          enumerable: true,
          value: (utils as any)[key],
        };
      }

      if (key === "length") {
        return {
          value: elements.length,
          writable: true,
          enumerable: false,
          configurable: false,
        };
      }

      if (typeof key === "symbol") {
        return Reflect.getOwnPropertyDescriptor(target, key);
      }

      const index = +key;
      if (!Number.isNaN(index) && index < elements.length) {
        return {
          value: proxify(elements[index], mod),
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }

      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  }) as unknown as ProxifiedArray<T>;
}

export function proxifyArray<T extends any[]>(
  node: ASTNode,
  mod?: ProxifiedModule,
): ProxifiedArray<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }
  return proxifyArrayElements(node, node.elements as any, mod) as any;
}
