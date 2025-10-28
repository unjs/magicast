import { Fork } from "../types";
import es2021Def from "./es2021";
import typesPlugin from "../types";
import { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  fork.use(es2021Def);

  const types = fork.use(typesPlugin);
  const def = types.Type.def;

  def("StaticBlock")
    .bases("Declaration")
    .build("body")
    .field("body", [def("Statement")]);
}

maybeSetModuleExports(() => module);
