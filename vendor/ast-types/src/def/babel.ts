import { Fork } from "../types";
import typesPlugin from "../types";
import babelCoreDef from "./babel-core";
import flowDef from "./flow";
import { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  const types = fork.use(typesPlugin);
  const def = types.Type.def;

  fork.use(babelCoreDef);
  fork.use(flowDef);

  // https://github.com/babel/babel/pull/10148
  def("V8IntrinsicIdentifier")
    .bases("Expression")
    .build("name")
    .field("name", String);

  // https://github.com/babel/babel/pull/13191
  // https://github.com/babel/website/pull/2541
  def("TopicReference")
    .bases("Expression")
    .build();
}

maybeSetModuleExports(() => module);
