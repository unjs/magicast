import * as recast from "recast";
import type { Program } from "@babel/types";
import type { ProxifiedModule } from "./types";
import { createProxy, literalToAst } from "./_utils";
import { proxify } from "./proxify";

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
        if (n.declaration) {
          // `export const greet = 'hi'`
          if (n.declaration.type === "VariableDeclaration") {
            const dec = n.declaration.declarations[0];
            if ("name" in dec.id && dec.id.name === key) {
              return dec.init as any;
            }
          }
          // `export function greet() {}`
          if (
            n.declaration.type === "FunctionDeclaration" &&
            n.declaration.id &&
            n.declaration.id.name === key
          ) {
            const decl = n.declaration;
            // Convert FunctionDeclaration to FunctionExpression to make it proxifiable as a callable function
            const funcExpr = b.functionExpression(
              decl.id as any,
              decl.params as any,
              decl.body as any,
              decl.generator,
              decl.async,
            );
            // WORKAROUND: Recast builder doesn't seem to preserve the async property
            funcExpr.async = decl.async;
            funcExpr.loc = decl.loc;
            return funcExpr;
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
        if (n.declaration) {
          if (n.declaration.type === "VariableDeclaration") {
            const dec = n.declaration.declarations[0];
            if ("name" in dec.id && dec.id.name === key) {
              dec.init = node;
              return;
            }
          }
          if (
            n.declaration.type === "FunctionDeclaration" &&
            n.declaration.id &&
            n.declaration.id.name === key
          ) {
            // Replace `export function` with `export const`
            const newExport = b.exportNamedDeclaration(
              b.variableDeclaration("const", [
                b.variableDeclarator(b.identifier(key), node),
              ]),
            );
            const index = root.body.indexOf(n);
            if (index !== -1) {
              root.body[index] = newExport as any;
            }
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
            ]),
          ) as any),
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
      ownKeys() {
        return root.body
          .flatMap((i) => {
            if (i.type === "ExportDefaultDeclaration") {
              return ["default"];
            }
            if (i.type === "ExportNamedDeclaration" && i.declaration) {
              if (i.declaration.type === "VariableDeclaration") {
                return i.declaration.declarations.map((d) =>
                  "name" in d.id ? d.id.name : "",
                );
              }
              if (i.declaration.type === "FunctionDeclaration") {
                return i.declaration.id ? [i.declaration.id.name] : [];
              }
            }
            return [];
          })
          .filter(Boolean);
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
            if (n.declaration) {
              if (n.declaration.type === "VariableDeclaration") {
                const dec = n.declaration.declarations[0];
                if ("name" in dec.id && dec.id.name === prop) {
                  root.body.splice(i, 1);
                  return true;
                }
              }
              if (
                n.declaration.type === "FunctionDeclaration" &&
                n.declaration.id &&
                n.declaration.id.name === prop
              ) {
                root.body.splice(i, 1);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  );
}
