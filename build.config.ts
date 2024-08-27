import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/helpers"],
  externals: ["@babel/types"],
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    dts: {
      respectExternal: true,
    }
  },
  alias: {
    'source-map': 'source-map-js',
    // eslint-disable-next-line unicorn/prefer-module
    recast: resolve(__dirname, 'vendor/recast/main.ts'),
    // eslint-disable-next-line unicorn/prefer-module
    'ast-types': resolve(__dirname, 'vendor/ast-types/src/main.ts'),
  },
  hooks: {
    'rollup:dts:options': (ctx, options) => {
      // @ts-expect-error filter out commonjs plugin in dts build
      options.plugins = options.plugins.filter((plugin) => {
        return plugin && plugin.name !== 'commonjs'
      })
    }
  }
});
