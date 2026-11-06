import { parseModule } from "magicast";
import { describe, expect, it } from "vitest";
import { generate } from "./_utils";

describe("imports", () => {
  it("manipulate imports", async () => {
    const mod = parseModule(`
import { defineConfig, Plugin } from 'vite'
import Vue from '@vitejs/plugin-vue'
import * as path from 'path'

export default defineConfig({
foo: []
})`);
    expect(mod.exports.default.$args[0]).toMatchInlineSnapshot(`
    {
      "foo": [],
    }
  `);
    expect(mod.imports).toMatchInlineSnapshot(`
    {
      "Plugin": {
        "from": "vite",
        "imported": "Plugin",
        "local": "Plugin",
      },
      "Vue": {
        "from": "@vitejs/plugin-vue",
        "imported": "default",
        "local": "Vue",
      },
      "defineConfig": {
        "from": "vite",
        "imported": "defineConfig",
        "local": "defineConfig",
      },
      "path": {
        "from": "path",
        "imported": "*",
        "local": "path",
      },
    }
  `);

    expect(mod.imports.path).toMatchInlineSnapshot(`
    {
      "from": "path",
      "imported": "*",
      "local": "path",
    }
  `);

    mod.imports.path.local = "path2";
    mod.imports.Vue.local = "VuePlugin";

    expect(Object.keys(mod.imports)).toMatchInlineSnapshot(`
      [
        "defineConfig",
        "Plugin",
        "VuePlugin",
        "path2",
      ]
    `);

    delete mod.imports.Plugin;

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { defineConfig } from "vite";
      import VuePlugin from "@vitejs/plugin-vue";
      import * as path2 from "path";

      export default defineConfig({
        foo: [],
      });"
    `);

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { defineConfig } from "vite";
      import VuePlugin from "@vitejs/plugin-vue";
      import * as path2 from "path";

      export default defineConfig({
        foo: [],
      });"
    `);

    mod.imports.$prepend({
      from: "foo",
      imported: "default",
      local: "Foo",
    });
    mod.imports.$prepend({
      from: "star",
      imported: "*",
      local: "Star",
    });
    mod.imports.$prepend({
      from: "vite",
      imported: "Good",
    });
    mod.imports.$append({
      from: "append-foo",
      imported: "default",
      local: "AppendFoo",
    });
    mod.imports.$append({
      from: "append-star",
      imported: "*",
      local: "AppendStar",
    });
    mod.imports.$append({
      from: "vite",
      imported: "AppendGood",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import * as Star from "star";
      import Foo from "foo";
      import { defineConfig, Good, AppendGood } from "vite";
      import VuePlugin from "@vitejs/plugin-vue";
      import * as path2 from "path";

      import AppendFoo from "append-foo";
      import * as AppendStar from "append-star";

      export default defineConfig({
        foo: [],
      });"
    `);

    mod.imports.defineConfig.from = "vitest/config";

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { defineConfig } from "vitest/config";
      import * as Star from "star";
      import Foo from "foo";
      import { Good, AppendGood } from "vite";
      import VuePlugin from "@vitejs/plugin-vue";
      import * as path2 from "path";

      import AppendFoo from "append-foo";
      import * as AppendStar from "append-star";

      export default defineConfig({
        foo: [],
      });"
    `);
  });

  it("keeps an import proxy in sync after moving its source", () => {
    const mod = parseModule(`import { foo } from "a"`);
    const item = mod.imports.foo;

    item.from = "b";

    expect(item.from).toBe("b");
    expect(mod.imports.foo.from).toBe("b");
  });

  it("does not merge into a declaration that cannot hold the specifier", async () => {
    const namespace = parseModule(`import * as path from "path"`);
    namespace.imports.$append({ imported: "join", from: "path" });
    expect(await generate(namespace)).toMatchInlineSnapshot(`
      "import * as path from "path";
      import { join } from "path";"
    `);

    const typeOnly = parseModule(`import type { UserConfig } from "vite"`);
    typeOnly.imports.$append({ imported: "defineConfig", from: "vite" });
    expect(await generate(typeOnly)).toMatchInlineSnapshot(`
      "import type { UserConfig } from "vite";
      import { defineConfig } from "vite";"
    `);

    const defaultImport = parseModule(`import a from "x"`);
    defaultImport.imports.$append({
      imported: "default",
      local: "b",
      from: "x",
    });
    expect(await generate(defaultImport)).toMatchInlineSnapshot(`
      "import a from "x";
      import b from "x";"
    `);
  });

  it("moves an import to its own declaration when the matching source cannot hold it", async () => {
    const mod = parseModule(
      `import { join } from "a"\nimport * as path from "path"`,
    );

    mod.imports.join.from = "path";

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { join } from "path";
      import * as path from "path";"
    `);
  });

  it("keeps a moved import type-only", async () => {
    const merged = parseModule(
      `import type { UserConfig } from "vite"\nimport type { Builtin } from "node"`,
    );
    merged.imports.UserConfig.from = "node";
    expect(await generate(merged)).toMatchInlineSnapshot(`
      "import type { Builtin, UserConfig } from "node";"
    `);

    const inline = parseModule(
      `import type { UserConfig } from "vite"\nimport { join } from "node"`,
    );
    inline.imports.UserConfig.from = "node";
    expect(await generate(inline)).toMatchInlineSnapshot(`
      "import { join, type UserConfig } from "node";"
    `);

    const ownDeclaration = parseModule(
      `import type { UserConfig } from "vite"\nconst a = 1`,
    );
    ownDeclaration.imports.UserConfig.from = "node";
    expect(await generate(ownDeclaration)).toMatchInlineSnapshot(`
      "import type { UserConfig } from "node";
      const a = 1;"
    `);
  });

  it("does not put a moved value import into a type-only declaration", async () => {
    const mod = parseModule(
      `import { join } from "node"\nimport type { UserConfig } from "vite"`,
    );

    mod.imports.join.from = "vite";

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { join } from "vite";
      import type { UserConfig } from "vite";"
    `);
  });

  it("merges into declarations that can still hold the specifier", async () => {
    const namespaceAndDefault = parseModule(`import * as ns from "x"`);
    namespaceAndDefault.imports.$append({
      imported: "default",
      local: "def",
      from: "x",
    });
    expect(await generate(namespaceAndDefault)).toMatchInlineSnapshot(`
      "import def, * as ns from "x";"
    `);

    const named = parseModule(`import a, { b } from "x"`);
    named.imports.$append({ imported: "c", from: "x" });
    expect(await generate(named)).toMatchInlineSnapshot(`
      "import a, { b, c } from "x";"
    `);
  });
});
