import { Fork } from "../types";
import es2021OpsDef from "./operators/es2021";
import es2020Def from "./es2020";
import { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  // The es2021OpsDef plugin comes before es2020Def so AssignmentOperators will
  // be appropriately augmented before first used.
  fork.use(es2021OpsDef);
  fork.use(es2020Def);
}

maybeSetModuleExports(() => module);
