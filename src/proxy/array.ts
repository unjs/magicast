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
    push(...values: any[]) {
      return elements.push(...values.map(v => literalToAst(v) as any));
    },
    pop() {
      return proxify(elements.pop() as any, mod);
    },
    unshift(...values: any[]) {
      return elements.unshift(...values.map(v => literalToAst(v) as any));
    },
    shift() {
      return proxify(elements.shift() as any, mod);
    },
    splice(start: number, ...rest: [number?, ...any[]]) {
      // `deleteCount` is only defaulted to 0 when it is passed explicitly;
      // omitting it removes every element from `start` onwards.
      const deleted = rest.length === 0
        ? elements.splice(start)
        : elements.splice(
            start,
            rest[0] as number,
            ...rest.slice(1).map(n => literalToAst(n)),
          );
      const result: any[] = [];
      result.length = deleted.length;
      for (let index = 0; index < deleted.length; index++) {
        if (deleted[index] != null) {
          result[index] = proxify(deleted[index], mod);
        }
      }
      return result;
    },
    toJSON() {
      return elements.map(n => proxify(n as any, mod));
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
          const results: any[] = [];
          const length = elements.length;
          results.length = length;
          for (let index = 0; index < length; index++) {
            if (elements[index] != null) {
              results[index] = callback(proxify(elements[index], mod), index, self);
            }
          }
          return results;
        };
      }
      if (key === "filter") {
        return (
          callback: (value: any, index: number, array: any[]) => boolean,
        ) => {
          const results = [];
          const length = elements.length;
          for (let index = 0; index < length; index++) {
            if (elements[index] == null) {
              continue;
            }
            const item = proxify(elements[index], mod);
            if (callback(item, index, self)) {
              results.push(item);
            }
          }
          return results;
        };
      }
      if (key === "forEach") {
        return (
          callback: (value: any, index: number, array: any[]) => void,
        ) => {
          const length = elements.length;
          for (let index = 0; index < length; index++) {
            if (elements[index] != null) {
              callback(proxify(elements[index], mod), index, self);
            }
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
          let accumulator: any;
          let startIndex = 0;
          const length = elements.length;

          if (initialValue.length > 0) {
            accumulator = initialValue[0];
          }
          else {
            while (startIndex < length && elements[startIndex] == null) {
              startIndex++;
            }
            if (startIndex === length) {
              throw new TypeError("Reduce of empty array with no initial value");
            }
            accumulator = proxify(elements[startIndex++], mod);
          }

          for (let index = startIndex; index < length; index++) {
            if (elements[index] != null) {
              accumulator = callback(
                accumulator,
                proxify(elements[index], mod),
                index,
                self,
              );
            }
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
      if (!Number.isNaN(index) && index < elements.length && elements[index] != null) {
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
