/* eslint-disable unicorn/no-nested-ternary */
import * as recast from "recast";
import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Program,
} from "@babel/types";
import { MagicastError } from "../error";
import type {
  ImportItemInput,
  ProxifiedImportItem,
  ProxifiedImportsMap,
  ProxifiedModule,
} from "./types";
import { createProxy } from "./_utils";

const b = recast.types.builders;
const _importProxyCache = new WeakMap<any, ProxifiedImportItem>();

export function creatImportProxy(
  node: ImportDeclaration,
  specifier:
    | ImportSpecifier
    | ImportNamespaceSpecifier
    | ImportDefaultSpecifier,
  root: Program,
): ProxifiedImportItem {
  if (_importProxyCache.has(specifier)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return _importProxyCache.get(specifier)!;
  }
  const proxy = createProxy(
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
          throw new MagicastError(
            "Changing import name is not yet implemented",
          );
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
        if (value === node.source.value) {
          return;
        }

        node.specifiers = node.specifiers.filter((s) => s !== specifier);
        if (node.specifiers.length === 0) {
          root.body = root.body.filter((s) => s !== node);
        }

        const declaration = root.body.find(
          (i) => i.type === "ImportDeclaration" && i.source.value === value,
        ) as ImportDeclaration | undefined;
        if (declaration) {
          // TODO: insert after the last import maybe?
          declaration.specifiers.push(specifier as any);
        } else {
          root.body.unshift(
            b.importDeclaration(
              [specifier as any],
              b.stringLiteral(value),
            ) as any,
          );
        }
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
        return ["imported", "local", "from", "toJSON"];
      },
    },
  ) as ProxifiedImportItem;
  _importProxyCache.set(specifier, proxy);
  return proxy;
}

export function createImportsProxy(
  root: Program,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mod: ProxifiedModule,
): ProxifiedImportsMap {
  // TODO: cache
  const getAllImports = () => {
    const imports: ReturnType<typeof creatImportProxy>[] = [];
    for (const n of root.body) {
      if (n.type === "ImportDeclaration") {
        for (const specifier of n.specifiers) {
          imports.push(creatImportProxy(n, specifier, root));
        }
      }
    }
    return imports;
  };

  const updateImport = (key: string, value: ImportItemInput) => {
    const imports = getAllImports();
    const item = imports.find((i) => i.local === key);
    const local = value.local || key;
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
        : b.importSpecifier(b.identifier(value.imported), b.identifier(local));

    const declaration = imports.find((i) => i.from === value.from)
      ?.$declaration;
    if (declaration) {
      // TODO: insert after the last import maybe?
      declaration.specifiers.push(specifier as any);
    } else {
      root.body.unshift(
        b.importDeclaration([specifier], b.stringLiteral(value.from)) as any,
      );
    }
    return true;
  };

  const removeImport = (key: string) => {
    const item = getAllImports().find((i) => i.local === key);
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
  };

  const proxy = createProxy(
    root,
    {
      $type: "imports",
      $add(item: ImportItemInput) {
        proxy[item.local || item.imported] = item as any;
      },
      get $items() {
        return getAllImports();
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
        return updateImport(prop as string, value);
      },
      deleteProperty(_, prop) {
        return removeImport(prop as string);
      },
      ownKeys() {
        return getAllImports().map((i) => i.local);
      },
      has(_, prop) {
        return getAllImports().some((i) => i.local === prop);
      },
    },
  ) as any as ProxifiedImportsMap;

  return proxy;
}
