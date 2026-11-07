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

type ImportKind
  = | "type"
    | "typeof"
    | "value";

/** A specifier as recast's builders and the AST hand it to us. */
type SpecifierLike = Pick<ImportSpecifierNode, "type"> & {
  importKind?: ImportKind | null;
};

/**
 * The kind a specifier carries: either its own inline `type` modifier
 * (`import { type A }`) or the kind of the declaration holding it
 * (`import type { A }`).
 */
function getImportKind(
  declaration: ImportDeclaration,
  specifier: SpecifierLike,
): ImportKind {
  const declarationKind = declaration.importKind || "value";
  if (declarationKind !== "value") {
    return declarationKind;
  }
  if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") {
    return "type";
  }
  return "value";
}

/**
 * Whether a specifier can be appended to an existing declaration without
 * producing invalid or semantically different JavaScript.
 */
function canAddSpecifier(
  declaration: ImportDeclaration,
  specifier: SpecifierLike,
  importKind: ImportKind = "value",
): boolean {
  const declarationKind = declaration.importKind || "value";

  const specifiers = declaration.specifiers as ImportSpecifierNode[];
  const hasDefault = specifiers.some(s => s.type === "ImportDefaultSpecifier");
  const hasNamespace = specifiers.some(
    s => s.type === "ImportNamespaceSpecifier",
  );
  const hasNamed = specifiers.some(s => s.type === "ImportSpecifier");

  if (importKind !== declarationKind) {
    // A value specifier cannot live in an `import type` declaration, while a
    // type-only one can only join it as an inline `type` modifier.
    if (declarationKind !== "value" || importKind !== "type") {
      return false;
    }
    if (specifier.type !== "ImportSpecifier") {
      return false;
    }
    // Inline type specifiers are named specifiers for the rules below.
    return !hasNamespace;
  }

  if (declarationKind !== "value") {
    // `import type` accepts either one default/namespace specifier or named
    // ones, never both (`import type A, { B }` does not parse).
    if (specifier.type !== "ImportSpecifier") {
      return specifiers.length === 0;
    }
    return !hasDefault && !hasNamespace;
  }

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

/**
 * Append a specifier to an existing declaration: default specifiers go first,
 * and a type-only specifier gets an inline `type` modifier when the declaration
 * itself is a value import.
 */
function addSpecifier(
  declaration: ImportDeclaration,
  specifier: SpecifierLike,
  importKind: ImportKind = "value",
): void {
  if (specifier.type === "ImportSpecifier") {
    // `import type` already makes every specifier type-only, so an inline
    // modifier there would be a syntax error.
    specifier.importKind
      = (declaration.importKind || "value") === importKind ? "value" : importKind;
  }
  // A default specifier must come before named or namespace ones.
  if (specifier.type === "ImportDefaultSpecifier") {
    declaration.specifiers.unshift(specifier as any);
  }
  else {
    declaration.specifiers.push(specifier as any);
  }
}

/**
 * Proxy a single import specifier, so that reading `from` reports its
 * declaration's source and writing it moves the specifier to another
 * declaration (or a new one). Proxies are cached per specifier node.
 */
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

        // The declaration carries the kind, so read it before detaching.
        const importKind = getImportKind(node, specifier);

        node.specifiers = node.specifiers.filter(s => s !== specifier);
        if (node.specifiers.length === 0) {
          root.body = root.body.filter(s => s !== node);
        }

        const declaration = root.body.find(
          i =>
            i.type === "ImportDeclaration"
            && i.source.value === value
            && canAddSpecifier(i, specifier, importKind),
        ) as ImportDeclaration | undefined;
        if (declaration) {
          // TODO: insert after the last import maybe?
          addSpecifier(declaration, specifier, importKind);
          node = declaration;
        }
        else {
          if (importKind !== "value" && specifier.type === "ImportSpecifier") {
            // Hoist an inline `type` modifier up to the new declaration.
            specifier.importKind = "value";
          }
          const newDeclaration = b.importDeclaration(
            [specifier as any],
            b.stringLiteral(value),
          );
          if (importKind !== "value") {
            (newDeclaration as ImportDeclaration).importKind = importKind;
          }
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
  /** Every import in the module, in declaration order. */
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

  /**
   * Update the import bound to `key` in place, or add it to an existing
   * declaration that can hold it, creating a new declaration otherwise.
   */
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

  /** Remove the import bound to `key`, and its declaration once it is empty. */
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
