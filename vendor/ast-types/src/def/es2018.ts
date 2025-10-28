import { Fork } from "../types";
import es2017Def from "./es2017";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  fork.use(es2017Def);

  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;
  const defaults = fork.use(sharedPlugin).defaults;

  def("ForOfStatement")
    .field("await", Boolean, defaults["false"]);

  // Legacy
  def("SpreadProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

  def("ObjectExpression")
    .field("properties", [or(
      def("Property"),
      def("SpreadProperty"), // Legacy
      def("SpreadElement")
    )]);

  def("TemplateElement")
    .field("value", {"cooked": or(String, null), "raw": String});

  // Legacy
  def("SpreadPropertyPattern")
    .bases("Pattern")
    .build("argument")
    .field("argument", def("Pattern"));

  def("ObjectPattern")
    .field("properties", [or(def("PropertyPattern"), def("Property"), def("RestElement"), def("SpreadPropertyPattern"))]);
};

maybeSetModuleExports(() => module);
