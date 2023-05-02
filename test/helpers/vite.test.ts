import { it, describe, expect } from "vitest";
import { parseModule } from "../../src";
import { addVitePlugin, updateVitePluginConfig } from "../../src/helpers";
import { generate } from "../_utils";

describe("helpers > vite", () => {
  it("add plugin", () => {
    const code = `
import { defineConfig } from 'vite'

export default defineConfig({})
`;
    const mod = parseModule(code);

    addVitePlugin(mod, {
      from: "@vitejs/plugin-vue",
      constructor: "vuePlugin",
      options: {
        include: [/\\.vue$/, /\.md$/],
      },
    });

    addVitePlugin(mod, {
      from: "vite-plugin-inspect",
      constructor: "Inspect",
      options: {
        build: true,
      },
    });

    addVitePlugin(mod, {
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
    });

    updateVitePluginConfig(mod, "vite-plugin-inspect", { dev: false });

    expect(generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from \\"vite-plugin-pwa\\";
      import Inspect from \\"vite-plugin-inspect\\";
      import vuePlugin from \\"@vitejs/plugin-vue\\";
      import { defineConfig } from \\"vite\\";

      export default defineConfig({
        plugins: [
          vuePlugin({
            include: [/\\\\\\\\.vue$/, /\\\\.md$/],
          }),
          Inspect({
            build: true,
            dev: false,
          }),
          VitePWA(),
        ],
      });"
    `);
  });

  it("add plugin at index", () => {
    const code = `
import { defineConfig } from 'vite'
import { somePlugin1, somePlugin2 } from 'some-module'

export default defineConfig({
  plugins: [somePlugin1(), somePlugin2()]
})
    `;

    const mod = parseModule(code);

    addVitePlugin(mod, {
      from: "@vitejs/plugin-vue",
      constructor: "vuePlugin",
      options: {
        include: [/\\.vue$/, /\.md$/],
      },
      index: 0, // at the beginning
    });

    addVitePlugin(mod, {
      from: "vite-plugin-inspect",
      constructor: "Inspect",
      options: {
        build: true,
      },
      index: 2, // in the middle
    });

    addVitePlugin(mod, {
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
      index: 5, // at the end, out of bounds on purpose
    });

    expect(generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from \\"vite-plugin-pwa\\";
      import Inspect from \\"vite-plugin-inspect\\";
      import vuePlugin from \\"@vitejs/plugin-vue\\";
      import { defineConfig } from \\"vite\\";
      import { somePlugin1, somePlugin2 } from \\"some-module\\";

      export default defineConfig({
        plugins: [
          vuePlugin({
            include: [/\\\\\\\\.vue$/, /\\\\.md$/],
          }),
          somePlugin1(),
          Inspect({
            build: true,
          }),
          somePlugin2(),
          VitePWA(),
        ],
      });"
    `);
  });
});
