import { describe, expect, it } from "vitest";
import { builder, parseCode, ProxifiedModule } from "../src";
import { generate } from "./_utils";

describe("function-calls", () => {
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

  it("construct function call", () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const installVuePlugin = (mod: ProxifiedModule<any>) => {
      // Inject export default if not exists
      if (!mod.exports.default) {
        mod.imports.$add({
          imported: "defineConfig",
          from: "vite",
        });
        mod.exports.default = builder.functionCall("defineConfig", {});
      }

      // Get config object, if it's a function call, get the first argument
      const config =
        mod.exports.default.$type === "function-call"
          ? mod.exports.default.$args[0]
          : mod.exports.default;

      // Inject vue plugin import
      mod.imports.$add({
        imported: "default",
        local: "vuePlugin",
        from: "@vitejs/plugin-vue",
      });

      // Install vue plugin
      config.plugins ||= [];
      config.plugins.push(
        builder.functionCall("vuePlugin", {
          jsx: true,
        })
      );
    };

    const mod1 = parseCode(`
      import { defineConfig } from 'vite'

      export default defineConfig({})
    `);
    const mod2 = parseCode("");

    installVuePlugin(mod1);
    installVuePlugin(mod2);

    expect(generate(mod1)).toMatchInlineSnapshot(`
      "import vuePlugin from \\"@vitejs/plugin-vue\\";
      import { defineConfig } from \\"vite\\";

      export default defineConfig({
        plugins: [
          vuePlugin({
            jsx: true,
          }),
        ],
      });"
    `);

    expect(generate(mod2)).toEqual(generate(mod1));
  });
});
