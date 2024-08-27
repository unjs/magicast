import { describe, expect, it } from "vitest";
import { builders, parseModule, ProxifiedModule } from "magicast";
import { generate } from "./_utils";

describe("function-calls", () => {
  it("function wrapper", async () => {
    const mod = parseModule(`
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a: any = { foo: 1 };
      export default defineConfig({
        // Modules
        modules: ["a", "b"],
      });"
    `);
  });

  it("construct function call", async () => {
    const installVuePlugin = (mod: ProxifiedModule<any>) => {
      // Inject export default if not exists
      if (!mod.exports.default) {
        mod.imports.$prepend({
          imported: "defineConfig",
          from: "vite",
        });
        mod.exports.default = builders.functionCall("defineConfig", {});
      }

      // Get config object, if it's a function call, get the first argument
      const config =
        mod.exports.default.$type === "function-call"
          ? mod.exports.default.$args[0]
          : mod.exports.default;

      // Inject vue plugin import
      mod.imports.$prepend({
        imported: "default",
        local: "vuePlugin",
        from: "@vitejs/plugin-vue",
      });

      // Install vue plugin
      config.plugins ||= [];
      config.plugins.push(
        builders.functionCall("vuePlugin", {
          jsx: true,
        }),
      );
    };

    const mod1 = parseModule(`
      import { defineConfig } from 'vite'

      export default defineConfig({})
    `);
    const mod2 = parseModule("");

    installVuePlugin(mod1);
    installVuePlugin(mod2);

    expect(await generate(mod1)).toMatchInlineSnapshot(`
      "import vuePlugin from "@vitejs/plugin-vue";
      import { defineConfig } from "vite";

      export default defineConfig({
        plugins: [
          vuePlugin({
            jsx: true,
          }),
        ],
      });"
    `);

    expect(await generate(mod2)).toEqual(await generate(mod1));
  });

  it("arrow function parameters", () => {
    const mod = parseModule(`
    import { defineConfig } from 'vite'

    export default defineConfig((config) => ({ mode: "test" }))
  `);

    expect(mod.exports.default.$args[0].$params[0].$name).toBe("config");
    expect(mod.exports.default.$args[0].$body.$type).toBe("object");
    expect(mod.exports.default.$args[0].$body.mode).toBe("test");
  });
});
