import { defineConfig } from "tsdown";
import { resolve } from "node:path";

export default defineConfig({
  entry: {
    core: "src/core.ts",
    index: "src/index.ts",
    helpers: "src/helpers/index.ts",
  },
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
