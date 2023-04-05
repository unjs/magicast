import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index", "src/helpers"],
  externals: ["@babel/types"],
  declaration: true,
  rollup: {
    emitCJS: true,
  },
});
