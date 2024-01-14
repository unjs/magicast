import { it, describe, expect } from "vitest";
import { parseModule } from "magicast";
import { generate } from "../_utils";
import { addVitePlugin, updateVitePluginConfig } from "magicast/helpers";

describe("helpers > vite", () => {
  it("add plugin", async () => {
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import Inspect from "vite-plugin-inspect";
      import vuePlugin from "@vitejs/plugin-vue";
      import { defineConfig } from "vite";

      export default defineConfig({
        plugins: [
          vuePlugin({
            include: [/\\\\.vue$/, /\\.md$/],
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

  it("add plugin at index", async () => {
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import Inspect from "vite-plugin-inspect";
      import vuePlugin from "@vitejs/plugin-vue";
      import { defineConfig } from "vite";
      import { somePlugin1, somePlugin2 } from "some-module";

      export default defineConfig({
        plugins: [
          vuePlugin({
            include: [/\\\\.vue$/, /\\.md$/],
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

  it("handles default export from identifier (fn call)", async () => {
    const code = `
      import { defineConfig } from 'vite';
      import { somePlugin1, somePlugin2 } from 'some-module'

      const config = defineConfig({
        plugins: [somePlugin1(), somePlugin2()]
      });

      export default config;
    `;

    const mod = parseModule(code);

    addVitePlugin(mod, {
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import { defineConfig } from "vite";
      import { somePlugin1, somePlugin2 } from "some-module";

      const config = defineConfig({
        plugins: [somePlugin1(), somePlugin2(), VitePWA()],
      });

      export default config;"
    `);
  });

  it("handles default export from identifier (object)", async () => {
    const code = `
      import { somePlugin1, somePlugin2 } from 'some-module'

      const myConfig = {
        plugins: [somePlugin1(), somePlugin2()]
      };

      export default myConfig;
    `;

    const mod = parseModule(code);

    addVitePlugin(mod, {
      index: 1,
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import { somePlugin1, somePlugin2 } from "some-module";

      const myConfig = {
        plugins: [somePlugin1(), VitePWA(), somePlugin2()],
      };

      export default myConfig;"
    `);
  });

  it("handles default export from identifier (object with satisfies)", async () => {
    const code = `
      import { somePlugin1, somePlugin2 } from 'some-module'

      import type { UserConfig } from 'vite';

      const myConfig = {
        plugins: [somePlugin1(), somePlugin2()]
      } satisfies UserConfig;

      export default myConfig;
    `;

    const mod = parseModule(code);

    addVitePlugin(mod, {
      index: 1,
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import { somePlugin1, somePlugin2 } from "some-module";

      import type { UserConfig } from "vite";

      const myConfig = {
        plugins: [somePlugin1(), VitePWA(), somePlugin2()],
      } satisfies UserConfig;

      export default myConfig;"
    `);
  });

  it("handles default export from identifier (function with satisfies)", async () => {
    const code = `
      import { somePlugin1, somePlugin2 } from 'some-module'

      import type { UserConfig } from 'vite';

      const myConfig = defineConfig({
        plugins: [somePlugin1(), somePlugin2()]
      }) satisfies UserConfig;

      export default myConfig;
    `;

    const mod = parseModule(code);

    addVitePlugin(mod, {
      index: 1,
      from: "vite-plugin-pwa",
      imported: "VitePWA",
      constructor: "VitePWA",
    });

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "import { VitePWA } from "vite-plugin-pwa";
      import { somePlugin1, somePlugin2 } from "some-module";

      import type { UserConfig } from "vite";

      const myConfig = defineConfig({
        plugins: [somePlugin1(), VitePWA(), somePlugin2()],
      }) satisfies UserConfig;

      export default myConfig;"
    `);
  });
});
