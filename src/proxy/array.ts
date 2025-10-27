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
    // Mutator methods - they modify the underlying AST
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
    toJSON() {
      return elements.map((n) => proxify(n as any, mod));
    },
  });

  return new Proxy([], {
    get(target, key, receiver) {
      if (key in utils) {
        return (utils as any)[key];
      }

      // Emulated non-mutating methods - they operate on the proxified elements
      const self = receiver as any[];
      if (key === "map") {
        return (callback: (value: any, index: number, array: any[]) => any) => {
          const results = [];
          let index = 0;
          for (const item of self) {
            results.push(callback(item, index, self));
            index++;
          }
          return results;
        };
      }
      if (key === "filter") {
        return (
          callback: (value: any, index: number, array: any[]) => boolean,
        ) => {
          const results = [];
          let index = 0;
          for (const item of self) {
            if (callback(item, index, self)) {
              results.push(item);
            }
            index++;
          }
          return results;
        };
      }
      if (key === "forEach") {
        return (
          callback: (value: any, index: number, array: any[]) => void,
        ) => {
          let index = 0;
          for (const item of self) {
            callback(item, index, self);
            index++;
          }
        };
      }
      if (key === "reduce") {
        return (
          callback: (
            previousValue: any,
            currentValue: any,
            currentIndex: number,
            array: any[],
          ) => any,
          ...initialValue: [any?]
        ) => {
          const array = [...self];
          if (array.length === 0 && initialValue.length === 0) {
            throw new TypeError("Reduce of empty array with no initial value");
          }

          let accumulator: any;
          let startIndex = 0;

          if (initialValue.length > 0) {
            accumulator = initialValue[0];
          } else {
            accumulator = array[0];
            startIndex = 1;
          }

          for (let i = startIndex; i < array.length; i++) {
            accumulator = callback(accumulator, array[i], i, array);
          }

          return accumulator;
        };
      }
      if (key === "find") {
        return (
          callback: (value: any, index: number, obj: any[]) => boolean,
        ) => {
          let index = 0;
          for (const item of self) {
            if (callback(item, index, self)) {
              return item;
            }
            index++;
          }
        };
      }
      if (key === "findIndex") {
        return (
          callback: (value: any, index: number, obj: any[]) => boolean,
        ) => {
          let index = 0;
          for (const item of self) {
            if (callback(item, index, self)) {
              return index;
            }
            index++;
          }
          return -1;
        };
      }
      if (key === "includes") {
        return (searchElement: any, fromIndex?: number) => {
          return [...self].includes(searchElement, fromIndex);
        };
      }

      // Property access
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
