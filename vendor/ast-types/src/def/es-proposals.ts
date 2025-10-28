import { Fork } from "../types";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";
import es2022Def from "./es2022";

export default function (fork: Fork) {
  fork.use(es2022Def);

  const types = fork.use(typesPlugin);
  const Type = types.Type;
  const def = types.Type.def;
  const or = Type.or;

  const shared = fork.use(sharedPlugin);
  const defaults = shared.defaults;

  def("AwaitExpression")
    .build("argument", "all")
    .field("argument", or(def("Expression"), null))
    .field("all", Boolean, defaults["false"]);

  // Decorators
  def("Decorator")
    .bases("Node")
    .build("expression")
    .field("expression", def("Expression"));

  def("Property")
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  def("MethodDefinition")
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  // Private names
  def("PrivateName")
    .bases("Expression", "Pattern")
    .build("id")
    .field("id", def("Identifier"));

  def("ClassPrivateProperty")
    .bases("ClassProperty")
    .build("key", "value")
    .field("key", def("PrivateName"))
    .field("value", or(def("Expression"), null), defaults["null"]);

  // https://github.com/tc39/proposal-import-assertions
  def("ImportAttribute")
    .bases("Node")
    .build("key", "value")
    .field("key", or(def("Identifier"), def("Literal")))
    .field("value", def("Expression"));

  [ "ImportDeclaration",
    "ExportAllDeclaration",
    "ExportNamedDeclaration",
  ].forEach(decl => {
    def(decl).field(
      "assertions",
      [def("ImportAttribute")],
      defaults.emptyArray,
    );
  });

  // https://github.com/tc39/proposal-record-tuple
  // https://github.com/babel/babel/pull/10865
  def("RecordExpression")
    .bases("Expression")
    .build("properties")
    .field("properties", [or(
      def("ObjectProperty"),
      def("ObjectMethod"),
      def("SpreadElement"),
    )]);
  def("TupleExpression")
    .bases("Expression")
    .build("elements")
    .field("elements", [or(
      def("Expression"),
      def("SpreadElement"),
      null,
    )]);

  // https://github.com/tc39/proposal-js-module-blocks
  // https://github.com/babel/babel/pull/12469
  def("ModuleExpression")
    .bases("Node")
    .build("body")
    .field("body", def("Program"));
};

maybeSetModuleExports(() => module);
