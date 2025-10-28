import { Fork } from "../types";
import esProposalsDef from "./es-proposals";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  fork.use(esProposalsDef);

  var types = fork.use(typesPlugin);
  var defaults = fork.use(sharedPlugin).defaults;
  var def = types.Type.def;
  var or = types.Type.or;

  def("VariableDeclaration")
    .field("declarations", [or(
      def("VariableDeclarator"),
      def("Identifier") // Esprima deviation.
    )]);

  def("Property")
    .field("value", or(
      def("Expression"),
      def("Pattern") // Esprima deviation.
    ));

  def("ArrayPattern")
    .field("elements", [or(
      def("Pattern"),
      def("SpreadElement"),
      null
    )]);

  def("ObjectPattern")
    .field("properties", [or(
      def("Property"),
      def("PropertyPattern"),
      def("SpreadPropertyPattern"),
      def("SpreadProperty") // Used by Esprima.
    )]);

  // Like ModuleSpecifier, except type:"ExportSpecifier" and buildable.
  // export {<id [as name]>} [from ...];
  def("ExportSpecifier")
    .bases("ModuleSpecifier")
    .build("id", "name");

  // export <*> from ...;
  def("ExportBatchSpecifier")
    .bases("Specifier")
    .build();

  def("ExportDeclaration")
    .bases("Declaration")
    .build("default", "declaration", "specifiers", "source")
    .field("default", Boolean)
    .field("declaration", or(
      def("Declaration"),
      def("Expression"), // Implies default.
      null
    ))
    .field("specifiers", [or(
      def("ExportSpecifier"),
      def("ExportBatchSpecifier")
    )], defaults.emptyArray)
    .field("source", or(
      def("Literal"),
      null
    ), defaults["null"]);

  def("Block")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

  def("Line")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");
};

maybeSetModuleExports(() => module);
