import * as recast from "recast";
import { Program } from "@babel/types";
import { createProxy, literalToAst } from "./_utils";
import { proxify } from "./proxify";
import { ProxifiedModule } from "./types";

const b = recast.types.builders;

export function createExportsProxy(root: Program, mod: ProxifiedModule) {
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
        ? b.exportDefaultDeclaration(node)
        : (b.exportNamedDeclaration(
            b.variableDeclaration("const", [
              b.variableDeclarator(b.identifier(key), node),
            ])
          ) as any)
    );
  };

  return createProxy(
    root,
    {
      $type: "exports",
    },
    {
      get(_, prop) {
        const node = findExport(prop as string);
        if (node) {
          return proxify(node, mod);
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
}
