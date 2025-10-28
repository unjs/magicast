import { Fork } from "../types";
import es2018Def from "./es2018";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  fork.use(es2018Def);

  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;

  def("CatchClause")
    .field("param", or(def("Pattern"), null), defaults["null"]);
};

maybeSetModuleExports(() => module);
