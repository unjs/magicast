import { maybeSetModuleExports } from "../../shared";
import es2016OpsDef from "./es2016";

export default function (fork: import("../../types").Fork) {
  const result = fork.use(es2016OpsDef);

  // Nullish coalescing. Must run before LogicalOperators is used.
  // https://github.com/tc39/proposal-nullish-coalescing
  if (result.LogicalOperators.indexOf("??") < 0) {
    result.LogicalOperators.push("??");
  }

  return result;
}

maybeSetModuleExports(() => module);
