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
  // Bundle all runtime/type dependencies so consumers install zero deps:
  // - @babel/parser is inlined into the JS bundle
  // - @babel/types is types-only and gets inlined into the d.ts bundle
  noExternal: ["@babel/parser", "@babel/types"],
  fixedExtension: false,
  // Keep identifiers readable for debugging; only strip whitespace
  minify: {
    compress: false,
    mangle: false,
    codegen: { removeWhitespace: true },
  },
});
