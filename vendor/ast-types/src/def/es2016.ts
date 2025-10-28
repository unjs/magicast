import { Fork } from "../types";
import es2016OpsDef from "./operators/es2016";
import es6Def from "./es6";
import { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  // The es2016OpsDef plugin comes before es6Def so BinaryOperators and
  // AssignmentOperators will be appropriately augmented before they are first
  // used in the core definitions for this fork.
  fork.use(es2016OpsDef);
  fork.use(es6Def);
};

maybeSetModuleExports(() => module);
