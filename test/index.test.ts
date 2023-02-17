import { expect, it, describe } from "vitest";
import { format } from "prettier";
import { parseCode, generateCode } from "../src";

function generate(mod: any) {
  return format(generateCode(mod).code, { parser: "babel-ts" }).trim();
}

describe("magicast", () => {
  it("basic object and array", () => {
    const mod = parseCode(`export default { a: 1, b: { c: {} } }`);

    mod.exports.default.a = 2;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 2, b: { c: {} } };"'
    );

    mod.exports.default.b.c = { d: 3 };

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,
        b: {
          c: {
            d: 3,
          },
        },
      };"
    `);

    expect(mod.exports.default.b.c.d).toBe(3);

    mod.exports.default.modules ||= [];

    expect(mod.exports.default.modules.$ast).toBeDefined();

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,

        b: {
          c: {
            d: 3,
          },
        },

        modules: [],
      };"
    `);

    mod.exports.default.modules.push("a");
    mod.exports.default.modules.unshift({ foo: "bar" });

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,

        b: {
          c: {
            d: 3,
          },
        },

        modules: [
          {
            foo: \\"bar\\",
          },
          \\"a\\",
        ],
      };"
    `);

    expect(mod.exports.default).toMatchInlineSnapshot(`
      {
        "a": 2,
        "b": {
          "c": {
            "d": 3,
          },
        },
        "modules": [
          {
            "foo": "bar",
          },
          "a",
        ],
      }
    `);

    expect(mod.exports.default.modules.$type).toBe("array");
    expect(mod.exports.default.modules[0].$type).toBe("object");
  });

  it("mix two configs", () => {
    const mod1 = parseCode(`export default { a: 1 }`);
    const mod2 = parseCode(`export default { b: 2 }`);

    mod1.exports.default.b = mod2.exports.default;

    expect(generate(mod1)).toMatchInlineSnapshot(
      `
      "export default {
        a: 1,

        b: {
          b: 2,
        },
      };"
    `
    );
  });

  it("function wrapper", () => {
    const mod = parseCode(`
      export const a: any = { foo: 1}
      export default defineConfig({
        // Modules
        modules: ["a"]
      })
    `);

    expect(mod.exports.a.foo).toBe(1);
    expect(mod.exports.default.$type).toBe("function-call");
    expect(mod.exports.default.$callee).toBe("defineConfig");
    expect(mod.exports.default.$args).toMatchInlineSnapshot(`
        [
          {
            "modules": [
              "a",
            ],
          },
        ]
      `);

    const options = mod.exports.default.$args[0];

    options.modules ||= [];
    options.modules.push("b");

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a: any = { foo: 1 };
      export default defineConfig({
        // Modules
        modules: [\\"a\\", \\"b\\"],
      });"
    `);
  });

  it("delete property", () => {
    const mod = parseCode(`export default { a: 1, b: [1, { foo: 'bar' }] }`);

    delete mod.exports.default.b[1].foo;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 1, b: [1, {}] };"'
    );

    delete mod.exports.default.b[0];
    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 1, b: [undefined, {}] };"'
    );

    delete mod.exports.default.a;
    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        b: [undefined, {}],
      };"
    `);
  });

  it("array operations", () => {
    const mod = parseCode(`export default [1, 2, 3, 4, 5]`);

    expect(mod.exports.default.length).toBe(5);
    expect(mod.exports.default.includes(5)).toBe(true);
    expect(mod.exports.default.includes(6)).toBe(false);

    const deleted = mod.exports.default.splice(1, 3, { foo: "bar" }, "bar");

    expect(deleted).toEqual([2, 3, 4]);

    expect(generate(mod)).toMatchInlineSnapshot(
      `
      "export default [
        1,
        {
          foo: \\"bar\\",
        },
        \\"bar\\",
        5,
      ];"
    `
    );

    const foundIndex = mod.exports.default.findIndex(
      (item) => item.foo === "bar"
    );
    const found = mod.exports.default.find((item) => item.foo === "bar");

    expect(foundIndex).toBe(1);
    expect(found).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `);
  });

  it("manipulate exports", () => {
    const mod = parseCode("");

    expect(mod.exports).toMatchInlineSnapshot(`{}`);
    expect(generate(mod)).toMatchInlineSnapshot('""');

    mod.exports.default = { foo: "1" };

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: \\"1\\",
      };"
    `);

    mod.exports.default.foo = 2;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: 2,
      };"
    `);

    mod.exports.named ||= [];
    mod.exports.named.push("a");

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: 2,
      };

      export const named = [\\"a\\"];"
    `);

    // delete
    delete mod.exports.default;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export const named = [\\"a\\"];"'
    );

    delete mod.exports.named;

    expect(generate(mod)).toMatchInlineSnapshot('""');
  });

  it("manipulate imports", () => {
    const mod = parseCode(`
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

    delete mod.imports.Plugin;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "import { defineConfig } from \\"vite\\";
      import VuePlugin from \\"@vitejs/plugin-vue\\";
      import * as path2 from \\"path\\";

      export default defineConfig({
        foo: [],
      });"
    `);

    expect(generate(mod)).toMatchInlineSnapshot(`
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

    expect(generate(mod)).toMatchInlineSnapshot(`
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

    expect(generate(mod)).toMatchInlineSnapshot(`
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
