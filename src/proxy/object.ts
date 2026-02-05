import * as recast from "recast";
import type { ASTNode } from "../types";
import { MagicastError } from "../error";
import type { ProxifiedModule, ProxifiedObject } from "./types";
import { literalToAst, createProxy, isValidPropName } from "./_utils";
import { proxify } from "./proxify";

const b = recast.types.builders;

export function proxifyObject<T extends object>(
  node: ASTNode,
  mod?: ProxifiedModule,
): ProxifiedObject<T> {
  if (!("properties" in node)) {
    return undefined as any;
  }

  const getPropName = (
    prop: (typeof node.properties)[0],
    throwError = false,
  ) => {
    // Cast to any to handle type mismatch between recast and @babel/types
    const propType = (prop as any).type;
    if (
      propType === "Property" ||
      propType === "ObjectProperty" ||
      propType === "ObjectMethod"
    ) {
      const propKey = (prop as any).key;
      if (propKey.type === "Identifier") {
        return propKey.name;
      }
      if (
        propKey.type === "StringLiteral" ||
        propKey.type === "NumericLiteral" ||
        propKey.type === "BooleanLiteral"
      ) {
        return propKey.value.toString();
      }
    }
    if (throwError) {
      throw new MagicastError(
        `Casting "${(prop as any).type}" is not supported`,
        {
          ast: prop,
          code: mod?.$code,
        },
      );
    }
    return undefined;
  };

  const getProp = (key: string | symbol) => {
    const stringKey = String(key);
    for (const prop of node.properties) {
      if (getPropName(prop) === stringKey) {
        const propType = (prop as any).type;
        if (propType === "Property" || propType === "ObjectProperty") {
          return (prop as any).value;
        }
        if (prop.type === "ObjectMethod") {
          const funcExpr = b.functionExpression(
            null, // id must be null, not undefined
            prop.params as any,
            prop.body as any,
            prop.generator,
            prop.async,
          );
          // WORKAROUND: Recast builder doesn't seem to preserve the async property
          funcExpr.async = prop.async;
          funcExpr.loc = prop.loc;
          return funcExpr;
        }
      }
    }
  };

  const replaceOrAddProp = (key: string, value: ASTNode) => {
    const prop = (node.properties as any[]).find(
      (p: any) => getPropName(p) === key,
    );
    if (prop) {
      const propType = (prop as any).type;
      if (propType === "Property" || propType === "ObjectProperty") {
        (prop as any).value = value;
      } else if (prop.type === "ObjectMethod") {
        const newProp = b.property("init", b.identifier(key), value as any);
        const index = node.properties.indexOf(prop);
        if (index !== -1) {
          node.properties[index] = newProp as any;
        }
      }
    } else {
      const newProp = b.property(
        "init",
        isValidPropName(key) ? b.identifier(key) : b.stringLiteral(key),
        value as any,
      );
      node.properties.push(newProp as any);
    }
  };

  return createProxy(
    node,
    {
      $type: "object",
      toJSON() {
        // eslint-disable-next-line unicorn/no-array-reduce
        return node.properties.reduce((acc, prop) => {
          const propName = getPropName(prop);
          if (propName) {
            const propType = (prop as any).type;
            if (propType === "Property" || propType === "ObjectProperty") {
              acc[propName] = proxify((prop as any).value, mod);
            } else if (prop.type === "ObjectMethod") {
              const funcExpr = b.functionExpression(
                null, // id must be null, not undefined
                prop.params as any,
                prop.body as any,
                prop.generator,
                prop.async,
              );
              // WORKAROUND: Recast builder doesn't seem to preserve the async property
              funcExpr.async = prop.async;
              funcExpr.loc = prop.loc;
              acc[propName] = proxify(funcExpr as any, mod);
            }
          }
          return acc;
        }, {} as any);
      },
    },
    {
      get(_, key) {
        const prop = getProp(key);
        if (prop) {
          return proxify<any>(prop, mod);
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
        const index = node.properties.findIndex((p) => getPropName(p) === key);
        if (index !== -1) {
          node.properties.splice(index, 1);
        }
        return true;
      },
      ownKeys() {
        return node.properties
          .map((p) => getPropName(p))
          .filter(Boolean) as string[];
      },
      getOwnPropertyDescriptor(target, key) {
        if (
          typeof key === "string" &&
          // eslint-disable-next-line unicorn/prefer-spread
          Array.from(this.ownKeys!(target)).includes(key)
        ) {
          return {
            enumerable: true,
            configurable: true,
          };
        }
        return undefined;
      },
      has(_, key) {
        if (typeof key === "string") {
          // eslint-disable-next-line unicorn/prefer-spread
          return Array.from(this.ownKeys!(_)).includes(key);
        }
        return false;
      },
    },
  ) as ProxifiedObject<T>;
}
