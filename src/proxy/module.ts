import * as recast from "recast";
import { ESNode, ParsedFileNode } from "../types";
import { ProxifiedModule } from "./types";
import { createProxy, literalToAst, proxify } from "./_utils";

export function proxifyModule<T>(ast: ParsedFileNode): ProxifiedModule<T> {
  const root = ast.program as ESNode;
  if (root.type !== "Program") {
    throw new Error(`Cannot proxify ${ast.type} as module`);
  }

  const findExport = (key: string) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          return n.declaration;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            return dec.init as any;
          }
        }
      }
    }
  };

  const updateOrAddExport = (key: string, value: any) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    const node = literalToAst(value) as any;
    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          n.declaration = node;
          return;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            dec.init = node;
            return;
          }
        }
      }
    }

    root.body.push(
      key === "default"
        ? recast.types.builders.exportDefaultDeclaration(node)
        : (recast.types.builders.exportNamedDeclaration(
            recast.types.builders.variableDeclaration("const", [
              recast.types.builders.variableDeclarator(
                recast.types.builders.identifier(key),
                node
              ),
            ])
          ) as any)
    );
  };

  const exportsProxy = createProxy(
    root,
    {},
    {
      get(_, prop) {
        const node = findExport(prop as string);
        if (node) {
          return proxify(node);
        }
      },
      set(_, prop, value) {
        updateOrAddExport(prop as string, value);
        return true;
      },
      deleteProperty(_, prop) {
        const type =
          prop === "default"
            ? "ExportDefaultDeclaration"
            : "ExportNamedDeclaration";

        for (let i = 0; i < root.body.length; i++) {
          const n = root.body[i];
          if (n.type === type) {
            if (prop === "default") {
              root.body.splice(i, 1);
              return true;
            }
            if (n.declaration && "declarations" in n.declaration) {
              const dec = n.declaration.declarations[0];
              if ("name" in dec.id && dec.id.name === prop) {
                root.body.splice(i, 1);
                return true;
              }
            }
          }
        }
        return false;
      },
    }
  );

  return {
    $ast: root,
    $type: "module",
    exports: exportsProxy,
    get imports() {
      throw new Error("Not implemented");
    },
  } as any;
}
