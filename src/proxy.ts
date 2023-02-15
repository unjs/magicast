import type { ESNode } from "./types";
import { literalToAst } from "./utils";

const literalTypes = new Set([
  "Literal",
  "StringLiteral",
  "NumericLiteral",
  "BooleanLiteral",
  "NullLiteral",
  "RegExpLiteral",
  "BigIntLiteral",
]);
const literals = new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined",
]);

export function proxify<T>(node: ESNode): Proxified<T> {
  if (literals.has(typeof node)) {
    return node as any;
  }
  if (literalTypes.has(node.type)) {
    return (node as any).value as any;
  }
  if (node.type === "ObjectExpression") {
    return proxifyObject<T>(node);
  }
  if (node.type === "ArrayExpression") {
    return proxifyArray<T>(node);
  }
  if (node.type === "CallExpression") {
    return proxifyFunctionCall(node);
  }
  throw new Error(`Cannot proxify ${node.type}`);
}

export function proxifyArray<T>(node: ESNode): Proxified<T> {
  if (!("elements" in node)) {
    return undefined as any;
  }

  const utils = {
    get $ast() {
      return node.type;
    },
    push(value: any) {
      node.elements.push(literalToAst(value) as any);
    },
    pop() {
      return proxify(node.elements.pop() as any);
    },
    unshift(value: any) {
      node.elements.unshift(literalToAst(value) as any);
    },
    shift() {
      return proxify(node.elements.shift() as any);
    },
    toJSON() {
      return node.elements.map((n) => proxify(n as any));
    },
  };

  const getItem = (key: number) => {
    return node.elements[key];
  };

  const replaceItem = (key: number, value: ESNode) => {
    node.elements[key] = value as any;
  };

  const proxy = new Proxy([], {
    get(_, key) {
      if (key in utils) {
        return (utils as any)[key];
      }
      if (key === "length") {
        return node.elements.length;
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
      return ["length", ...node.elements.map((_, i) => i.toString())];
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

export function proxifyFunctionCall<T>(node: ESNode): Proxified<T> {
  throw new Error("Not implemented");
}

export function proxifyObject<T>(node: ESNode): Proxified<T> {
  if (!("properties" in node)) {
    return undefined as any;
  }

  const utils = {
    get $ast() {
      return node.type;
    },
    toJSON() {
      // @ts-expect-error
      // eslint-disable-next-line unicorn/no-array-reduce
      return node.properties.reduce((acc, prop) => {
        if ("key" in prop && "name" in prop.key) {
          acc[prop.key.name] = proxify(prop.value);
        }
        return acc;
      }, {} as any);
    },
  };

  const getProp = (key: string | symbol) => {
    for (const prop of node.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        return prop.value;
      }
    }
  };
  const replaceOrAddProp = (key: string, value: ESNode) => {
    const index = node.properties.findIndex(
      (prop) => "key" in prop && "name" in prop.key && prop.key.name === key
    );
    if (index !== -1) {
      (node.properties[index] as any).value = value;
    } else {
      node.properties.push({
        type: "Property",
        key: {
          type: "Identifier",
          name: key,
        },
        value,
      } as any);
    }
  };

  const proxy = new Proxy(
    {},
    {
      get(_, key) {
        if (key in utils) {
          return (utils as any)[key];
        }
        const prop = getProp(key);
        if (prop) {
          return proxify(prop);
        }
      },
      set(_, key, value) {
        if (typeof key !== "string") {
          key = String(key);
        }
        replaceOrAddProp(key, literalToAst(value));
        return true;
      },
      ownKeys() {
        return node.properties
          .map((prop) => {
            if ("key" in prop && "name" in prop.key) {
              return prop.key.name;
            }
            return undefined;
          })
          .filter(Boolean) as string[];
      },
      getOwnPropertyDescriptor() {
        return {
          enumerable: true,
          configurable: true,
        };
      },
    }
  ) as any;

  return proxy;
}

export type ProxifiedUtils = {
  $ast: ESNode;
};

export type Proxified<T = any> = T extends
  | number
  | string
  | null
  | undefined
  | boolean
  | bigint
  | symbol
  ? T
  : T extends object
  ? { [K in keyof T]: Proxified<T[K]> } & ProxifiedUtils
  : T;
