import { expect, it, describe } from "vitest";
import { parseModule } from "magicast";
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
});
