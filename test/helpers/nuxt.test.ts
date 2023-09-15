import { it, describe, expect } from "vitest";
import { generate } from "../_utils";
import { parseModule } from "magicast";
import { addNuxtModule } from "magicast/helpers";

describe("helpers > nuxt", () => {
  it("add module", async () => {
    const code = `export default defineNuxtConfig({})`;
    const mod = parseModule(code);

    addNuxtModule(mod, "@vueuse/nuxt", "vueuse", { hello: "world" });
    addNuxtModule(mod, "@unocss/nuxt", "unocss", { another: "config" });

    expect(await generate(mod)).toMatchInlineSnapshot(`
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
