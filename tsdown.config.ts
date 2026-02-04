import { defineConfig } from "tsdown";
import { resolve } from "node:path";

export default defineConfig({
  entry: ["src/index.ts", "src/helpers/index.ts", "src/browser.ts"],
  alias: {
    "source-map": "source-map-js",
    recast: resolve(import.meta.dirname, "vendor/recast/main.ts"),
    "ast-types": resolve(import.meta.dirname, "vendor/ast-types/src/main.ts"),
  },
  exports: {
    legacy: true,
  },
  external: ["@babel/types"],
  fixedExtension: false,
});
