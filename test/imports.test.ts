import { expect, it, describe } from "vitest";
import { generate } from "./_utils";
import { parseModule } from "magicast";

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
    "import { defineConfig } from \\"vite\\";
    import VuePlugin from \\"@vitejs/plugin-vue\\";
    import * as path2 from \\"path\\";

    export default defineConfig({
      foo: [],
    });"
  `);

    expect(await generate(mod)).toMatchInlineSnapshot(`
    "import { defineConfig } from \\"vite\\";
    import VuePlugin from \\"@vitejs/plugin-vue\\";
    import * as path2 from \\"path\\";

    export default defineConfig({
      foo: [],
    });"
  `);

    mod.imports.$add({
      from: "foo",
      imported: "default",
      local: "Foo",
    });
    mod.imports.$add({
      from: "star",
      imported: "*",
      local: "Star",
    });
    mod.imports.$add({
      from: "vite",
      imported: "Good",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
    "import * as Star from \\"star\\";
    import Foo from \\"foo\\";
    import { defineConfig, Good } from \\"vite\\";
    import VuePlugin from \\"@vitejs/plugin-vue\\";
    import * as path2 from \\"path\\";

    export default defineConfig({
      foo: [],
    });"
  `);

    mod.imports.defineConfig.from = "vitest/config";

    expect(await generate(mod)).toMatchInlineSnapshot(`
    "import { defineConfig } from \\"vitest/config\\";
    import * as Star from \\"star\\";
    import Foo from \\"foo\\";
    import { Good } from \\"vite\\";
    import VuePlugin from \\"@vitejs/plugin-vue\\";
    import * as path2 from \\"path\\";

    export default defineConfig({
      foo: [],
    });"
  `);
  });
});
