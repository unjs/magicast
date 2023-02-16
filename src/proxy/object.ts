import { ESNode } from "../types";
import { literalToAst, createProxy, proxify } from "./_utils";
import { Proxified } from "./types";

export function proxifyObject<T>(node: ESNode): Proxified<T> {
  if (!("properties" in node)) {
    return undefined as any;
  }

  const getProp = (key: string | symbol) => {
    for (const prop of node.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        // TODO:
        return (prop as any).value;
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

  return createProxy(
    node,
    {
      $type: "object",
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
    },
    {
      get(_, key) {
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
      deleteProperty(_, key) {
        if (typeof key !== "string") {
          key = String(key);
        }
        const index = node.properties.findIndex(
          (prop) => "key" in prop && "name" in prop.key && prop.key.name === key
        );
        if (index !== -1) {
          node.properties.splice(index, 1);
        }
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
  ) as Proxified<T>;
}
