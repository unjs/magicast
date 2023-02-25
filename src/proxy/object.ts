import * as recast from "recast";
import { ESNode } from "../types";
import { MagicastError } from "../error";
import { literalToAst, createProxy, isValidPropName } from "./_utils";
import { proxify } from "./proxify";
import { Proxified, ProxifiedModule } from "./types";

const b = recast.types.builders;

export function proxifyObject<T>(
  node: ESNode,
  mod?: ProxifiedModule
): Proxified<T> {
  if (!("properties" in node)) {
    return undefined as any;
  }

  const getProp = (key: string | symbol) => {
    for (const prop of node.properties) {
      if ("key" in prop && "name" in prop.key && prop.key.name === key) {
        // TODO:
        return (prop as any).value;
      }
      if (
        prop.type === "ObjectProperty" &&
        prop.key.type === "StringLiteral" &&
        prop.key.value === key
      ) {
        return (prop.value as any).value;
      }
    }
  };

  const getPropName = (
    prop: (typeof node.properties)[0],
    throwError = false
  ) => {
    if ("key" in prop && "name" in prop.key) {
      return prop.key.name;
    }
    if (prop.type === "ObjectProperty" && prop.key.type === "StringLiteral") {
      return prop.key.value;
    }
    if (throwError) {
      throw new MagicastError(`Casting "${prop.type}" is not supported`, {
        ast: prop,
        code: mod?.$code,
      });
    }
  };

  const replaceOrAddProp = (key: string, value: ESNode) => {
    const prop = (node.properties as any[]).find(
      (prop: any) => getPropName(prop) === key
    );
    if (prop) {
      prop.value = value;
    } else if (isValidPropName(key)) {
      node.properties.push({
        type: "Property",
        key: {
          type: "Identifier",
          name: key,
        },
        value,
      } as any);
    } else {
      node.properties.push({
        type: "ObjectProperty",
        key: b.stringLiteral(key),
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
            acc[prop.key.name] = proxify(prop.value, mod);
          }
          return acc;
        }, {} as any);
      },
    },
    {
      get(_, key) {
        const prop = getProp(key);
        if (prop) {
          return proxify(prop, mod);
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
          .map((prop) => getPropName(prop, true))
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
