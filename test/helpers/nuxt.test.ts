import { it, describe, expect } from "vitest";
import { parseModule } from "../../src";
import { addNuxtModule } from "../../src/helpers";
import { generate } from "../_utils";

describe("helpers > nuxt", () => {
  it("add module", () => {
    const code = `export default defineNuxtConfig({})`;
    const mod = parseModule(code);
    addNuxtModule(mod, "@vueuse/nuxt", "vueuse", { hello: "world" });
    addNuxtModule(mod, "@unocss/nuxt", "unocss", { another: "config" });

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default defineNuxtConfig({
        modules: [\\"@vueuse/nuxt\\", \\"@unocss/nuxt\\"],

        vueuse: {
          hello: \\"world\\",
        },

        unocss: {
          another: \\"config\\",
        },
      });"
    `);
  });

  it("add module, keep format", () => {
    const code = `export default defineNuxtConfig({
      modules: [
        'foo',
      ]
    })`;

    const mod = parseModule(code);
    addNuxtModule(mod, "@vueuse/nuxt", "vueuse", { hello: "world" });
    addNuxtModule(mod, "@unocss/nuxt", "unocss", { another: "config" });

    expect(mod.generate().code).toMatchInlineSnapshot(`
      "export default defineNuxtConfig({
        modules: [
          'foo',
          '@vueuse/nuxt',
          '@unocss/nuxt'
        ],

        vueuse: {
          hello: 'world'
        },

        unocss: {
          another: 'config'
        }
      })"
    `);
  });
});
