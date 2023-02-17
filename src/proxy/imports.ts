/* eslint-disable unicorn/no-nested-ternary */
import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Program,
} from "@babel/types";
import { b, createProxy } from "./_utils";
import { ImprotItemInput, ProxifiedImportItem, ProxifiedImportsMap } from "./types";

export function creatImportProxy(
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

export function createImportsProxy(root: Program) {
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

  const proxy = createProxy(
    root,
    {
      $type: "imports",
      $add(item: ImprotItemInput) {
        proxy[item.local || item.imported] = item as any;
      },
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
  ) as any as ProxifiedImportsMap;

  return proxy
}
