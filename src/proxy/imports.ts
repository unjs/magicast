import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Program,
} from "@babel/types";
import type {
  ImportItemInput,
  ProxifiedImportItem,
  ProxifiedImportsMap,
  ProxifiedModule,
} from "./types";
import * as recast from "recast";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";

const b = recast.types.builders;
const _importProxyCache = new WeakMap<any, ProxifiedImportItem>();

type ImportSpecifierNode
  = | ImportSpecifier
    | ImportNamespaceSpecifier
    | ImportDefaultSpecifier;

/**
 * Whether a specifier can be appended to an existing declaration without
 * producing invalid or semantically different JavaScript.
 */
function canAddSpecifier(
  declaration: ImportDeclaration,
  specifier: Pick<ImportSpecifierNode, "type">,
): boolean {
  // `import type` declarations only hold type-only specifiers. The input has no
  // way to express one, so a value import always needs its own declaration.
  if (declaration.importKind === "type" || declaration.importKind === "typeof") {
    return false;
  }

  const specifiers = declaration.specifiers as ImportSpecifierNode[];
  const hasDefault = specifiers.some(s => s.type === "ImportDefaultSpecifier");
  const hasNamespace = specifiers.some(
    s => s.type === "ImportNamespaceSpecifier",
  );
  const hasNamed = specifiers.some(s => s.type === "ImportSpecifier");

  if (specifier.type === "ImportNamespaceSpecifier") {
    // `import def, * as ns from "x"` is valid, `import { named }, * as ns` is not.
    return !hasNamespace && !hasNamed;
  }
  if (specifier.type === "ImportDefaultSpecifier") {
    return !hasDefault;
  }
  // Named specifiers cannot be combined with a namespace specifier.
  return !hasNamespace;
}

function addSpecifier(
  declaration: ImportDeclaration,
  specifier: Pick<ImportSpecifierNode, "type">,
): void {
  // A default specifier must come before named or namespace ones.
  if (specifier.type === "ImportDefaultSpecifier") {
    declaration.specifiers.unshift(specifier as any);
  }
  else {
    declaration.specifiers.push(specifier as any);
  }
}

export function createImportProxy(
  node: ImportDeclaration,
  specifier:
    ImportSpecifier | ImportNamespaceSpecifier | ImportDefaultSpecifier,
  root: Program,
): ProxifiedImportItem {
  if (_importProxyCache.has(specifier)) {
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
        }
        else {
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

        node.specifiers = node.specifiers.filter(s => s !== specifier);
        if (node.specifiers.length === 0) {
          root.body = root.body.filter(s => s !== node);
        }

        const declaration = root.body.find(
          i =>
            i.type === "ImportDeclaration"
            && i.source.value === value
            && canAddSpecifier(i, specifier),
        ) as ImportDeclaration | undefined;
        if (declaration) {
          // TODO: insert after the last import maybe?
          addSpecifier(declaration, specifier);
          node = declaration;
        }
        else {
          const newDeclaration = b.importDeclaration(
            [specifier as any],
            b.stringLiteral(value),
          );
          root.body.unshift(newDeclaration as any);
          node = newDeclaration as any;
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
  _mod: ProxifiedModule,
): ProxifiedImportsMap {
  // TODO: cache
  const getAllImports = () => {
    const imports: ReturnType<typeof createImportProxy>[] = [];
    for (const n of root.body) {
      if (n.type === "ImportDeclaration") {
        for (const specifier of n.specifiers) {
          imports.push(createImportProxy(n, specifier, root));
        }
      }
    }
    return imports;
  };

  const updateImport = (
    key: string,
    value: ImportItemInput,
    order: "prepend" | "append",
  ) => {
    const imports = getAllImports();
    const item = imports.find(i => i.local === key);
    const local = value.local || key;
    if (item) {
      item.imported = value.imported;
      item.local = local;
      item.from = value.from;
      return true;
    }

    const specifier
      = value.imported === "default"
        ? b.importDefaultSpecifier(b.identifier(local))
        : value.imported === "*"
          ? b.importNamespaceSpecifier(b.identifier(local))
          : b.importSpecifier(
              b.identifier(value.imported),
              b.identifier(local),
            );

    const declaration = imports.find(
      i => i.from === value.from && canAddSpecifier(i.$declaration, specifier),
    )?.$declaration;
    if (declaration) {
      addSpecifier(declaration, specifier);
    }
    else if (order === "prepend" || imports.length === 0) {
      root.body.unshift(
        b.importDeclaration([specifier], b.stringLiteral(value.from)) as any,
      );
    }
    else {
      // The `imports` length is already checked above, so `at(-1)` will exist
      const lastImport = imports.at(-1)!.$declaration;
      const lastImportIndex = root.body.indexOf(lastImport);
      root.body.splice(
        lastImportIndex + 1,
        0,
        b.importDeclaration([specifier], b.stringLiteral(value.from)) as any,
      );
    }
    return true;
  };

  const removeImport = (key: string) => {
    const item = getAllImports().find(i => i.local === key);
    if (!item) {
      return false;
    }
    const node = item.$declaration;
    const specifier = item.$ast;
    node.specifiers = node.specifiers.filter(s => s !== specifier);
    if (node.specifiers.length === 0) {
      root.body = root.body.filter(n => n !== node);
    }
    return true;
  };

  const proxy = createProxy(
    root,
    {
      $type: "imports",
      $add(item: ImportItemInput) {
        updateImport(item.local || item.imported, item, "prepend");
      },
      $prepend(item: ImportItemInput) {
        updateImport(item.local || item.imported, item, "prepend");
      },
      $append(item: ImportItemInput) {
        updateImport(item.local || item.imported, item, "append");
      },
      get $items() {
        return getAllImports();
      },
      toJSON() {
        return getAllImports().reduce((acc, i) => {
          acc[i.local] = i;
          return acc;
        }, {} as any);
      },
    },
    {
      get(_, prop) {
        return getAllImports().find(i => i.local === prop);
      },
      set(_, prop, value) {
        return updateImport(prop as string, value, "prepend");
      },
      deleteProperty(_, prop) {
        return removeImport(prop as string);
      },
      ownKeys() {
        return getAllImports().map(i => i.local);
      },
      has(_, prop) {
        return getAllImports().some(i => i.local === prop);
      },
    },
  ) as any as ProxifiedImportsMap;

  return proxy;
}
