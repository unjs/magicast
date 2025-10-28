import { Fork } from "../types";
import es2020OpsDef from "./operators/es2020";
import es2019Def from "./es2019";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  // The es2020OpsDef plugin comes before es2019Def so LogicalOperators will be
  // appropriately augmented before first used.
  fork.use(es2020OpsDef);

  fork.use(es2019Def);

  const types = fork.use(typesPlugin);
  const def = types.Type.def;
  const or = types.Type.or;

  const shared = fork.use(sharedPlugin);
  const defaults = shared.defaults;

  def("ImportExpression")
    .bases("Expression")
    .build("source")
    .field("source", def("Expression"));

  def("ExportAllDeclaration")
    .bases("Declaration")
    .build("source", "exported")
    .field("source", def("Literal"))
    .field("exported", or(
      def("Identifier"),
      null,
      void 0,
    ), defaults["null"]);

  // Optional chaining
  def("ChainElement")
    .bases("Node")
    .field("optional", Boolean, defaults["false"]);

  def("CallExpression")
    .bases("Expression", "ChainElement");

  def("MemberExpression")
    .bases("Expression", "ChainElement");

  def("ChainExpression")
    .bases("Expression")
    .build("expression")
    .field("expression", def("ChainElement"));

  def("OptionalCallExpression")
    .bases("CallExpression")
    .build("callee", "arguments", "optional")
    .field("optional", Boolean, defaults["true"]);

  // Deprecated optional chaining type, doesn't work with babelParser@7.11.0 or newer
  def("OptionalMemberExpression")
    .bases("MemberExpression")
    .build("object", "property", "computed", "optional")
    .field("optional", Boolean, defaults["true"]);
};

maybeSetModuleExports(() => module);
