/* eslint-disable unicorn/no-nested-ternary */
import * as recast from "recast";
import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Program,
} from "@babel/types";
import { ParsedFileNode } from "../types";
import { ProxifiedImportItem, ProxifiedModule } from "./types";
import { createProxy, literalToAst, proxify } from "./_utils";

const b = recast.types.builders;

export function proxifyModule<T>(ast: ParsedFileNode): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new Error(`Cannot proxify ${ast.type} as module`);
  }

  return {
    $ast: root,
    $type: "module",
    exports: createExportsProxy(root),
    imports: createImportsProxy(root),
  } as any;
}

function createExportsProxy(root: Program) {
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

  return createProxy(
    root,
    {
      $type: "exports",
    },
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
}

function creatImportProxy(
  node: ImportDeclaration,
  specifier: ImportSpecifier | ImportNamespaceSpecifier | ImportDefaultSpecifier
) {
  return createProxy(
    specifier,
    {
      get $declaration() {
        return node;
      },
      get imported() {
        if (specifier.type === "ImportDefaultSpecifier") {
          return "default";
        }
        if (specifier.type === "ImportNamespaceSpecifier") {
          return "*";
        }
        if (specifier.imported.type === "Identifier") {
          return specifier.imported.name;
        }
        return specifier.imported.value;
      },
      set imported(value) {
        if (specifier.type !== "ImportSpecifier") {
          throw new Error("Changing import name is not yet implemented");
        }
        if (specifier.imported.type === "Identifier") {
          specifier.imported.name = value;
        } else {
          specifier.imported.value = value;
        }
      },
      get local() {
        return specifier.local.name;
      },
      set local(value) {
        specifier.local.name = value;
      },
      get from() {
        return node.source.value;
      },
      set from(value) {
        throw new Error("Changing import source is not yet implemented");
      },
      toJSON() {
        return {
          imported: this.imported,
          local: this.local,
          from: this.from,
        };
      },
    },
    {
      ownKeys() {
        return ["imported", "local", "from"];
      },
    }
  ) as ProxifiedImportItem;
}

function createImportsProxy(root: Program) {
  const getAllImports = () => {
    const imports: ReturnType<typeof creatImportProxy>[] = [];
    for (const n of root.body) {
      if (n.type === "ImportDeclaration") {
        for (const specifier of n.specifiers) {
          imports.push(creatImportProxy(n, specifier));
        }
      }
    }
    return imports;
  };

  return createProxy(
    root,
    {
      $type: "imports",
      toJSON() {
        // eslint-disable-next-line unicorn/no-array-reduce
        return getAllImports().reduce((acc, i) => {
          acc[i.local] = i;
          return acc;
        }, {} as any);
      },
    },
    {
      get(_, prop) {
        return getAllImports().find((i) => i.local === prop);
      },
      set(_, prop, value) {
        const imports = getAllImports();
        const item = imports.find((i) => i.local === prop);
        const local = value.local || prop;
        if (item) {
          item.imported = value.imported;
          item.local = local;
          item.from = value.from;
          return true;
        }

        const specifier =
          value.imported === "default"
            ? b.importDefaultSpecifier(b.identifier(local))
            : value.imported === "*"
            ? b.importNamespaceSpecifier(b.identifier(local))
            : b.importSpecifier(
                b.identifier(value.imported),
                b.identifier(local)
              );

        const declaration = imports.find(
          (i) => i.from === value.from
        )?.$declaration;
        if (!declaration) {
          root.body.unshift(
            b.importDeclaration([specifier], b.stringLiteral(value.from)) as any
          );
        } else {
          // TODO: insert after the last import maybe?
          declaration.specifiers.push(specifier as any);
        }
        return true;
      },
      deleteProperty(_, prop) {
        const item = getAllImports().find((i) => i.local === prop);
        if (!item) {
          return false;
        }
        const node = item.$declaration;
        const specifier = item.$ast;
        node.specifiers = node.specifiers.filter((s) => s !== specifier);
        if (node.specifiers.length === 0) {
          root.body = root.body.filter((n) => n !== node);
        }
        return true;
      },
      ownKeys() {
        return getAllImports().map((i) => i.local);
      },
      has(_, prop) {
        return getAllImports().some((i) => i.local === prop);
      },
    }
  );
}
