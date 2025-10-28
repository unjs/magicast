import { Fork } from "../types";
import esProposalsDef from "./es-proposals";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";
import { namedTypes as N } from "../gen/namedTypes";

export default function (fork: Fork) {
  fork.use(esProposalsDef);

  const types = fork.use(typesPlugin);
  const defaults = fork.use(sharedPlugin).defaults;
  const def = types.Type.def;
  const or = types.Type.or;
  const {
    undefined: isUndefined,
  } = types.builtInTypes;

  def("Noop")
    .bases("Statement")
    .build();

  def("DoExpression")
    .bases("Expression")
    .build("body")
    .field("body", [def("Statement")]);

  def("BindExpression")
    .bases("Expression")
    .build("object", "callee")
    .field("object", or(def("Expression"), null))
    .field("callee", def("Expression"));

  def("ParenthesizedExpression")
    .bases("Expression")
    .build("expression")
    .field("expression", def("Expression"));

  def("ExportNamespaceSpecifier")
    .bases("Specifier")
    .build("exported")
    .field("exported", def("Identifier"));

  def("ExportDefaultSpecifier")
    .bases("Specifier")
    .build("exported")
    .field("exported", def("Identifier"));

  def("CommentBlock")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

  def("CommentLine")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

  def("Directive")
    .bases("Node")
    .build("value")
    .field("value", def("DirectiveLiteral"));

  def("DirectiveLiteral")
    .bases("Node", "Expression")
    .build("value")
    .field("value", String, defaults["use strict"]);

  def("InterpreterDirective")
    .bases("Node")
    .build("value")
    .field("value", String);

  def("BlockStatement")
    .bases("Statement")
    .build("body")
    .field("body", [def("Statement")])
    .field("directives", [def("Directive")], defaults.emptyArray);

  def("Program")
    .bases("Node")
    .build("body")
    .field("body", [def("Statement")])
    .field("directives", [def("Directive")], defaults.emptyArray)
    .field("interpreter", or(def("InterpreterDirective"), null), defaults["null"]);

  function makeLiteralExtra<
    // Allowing N.RegExpLiteral explicitly here is important because the
    // node.value field of RegExpLiteral nodes can be undefined, which is not
    // allowed for other Literal subtypes.
    TNode extends Omit<N.Literal, "type"> | N.RegExpLiteral
  >(
    rawValueType: any = String,
    toRaw?: (value: any) => string,
  ): Parameters<import("../types").Def["field"]> {
    return [
      "extra",
      {
        rawValue: rawValueType,
        raw: String,
      },
      function getDefault(this: TNode) {
        const value = types.getFieldValue(this, "value");
        return {
          rawValue: value,
          raw: toRaw ? toRaw(value) : String(value),
        };
      },
    ];
  }

  // Split Literal
  def("StringLiteral")
    .bases("Literal")
    .build("value")
    .field("value", String)
    .field(...makeLiteralExtra<N.StringLiteral>(String, val => JSON.stringify(val)));

  def("NumericLiteral")
    .bases("Literal")
    .build("value")
    .field("value", Number)
    .field("raw", or(String, null), defaults["null"])
    .field(...makeLiteralExtra<N.NumericLiteral>(Number));

  def("BigIntLiteral")
    .bases("Literal")
    .build("value")
    // Only String really seems appropriate here, since BigInt values
    // often exceed the limits of JS numbers.
    .field("value", or(String, Number))
    .field(...makeLiteralExtra<N.BigIntLiteral>(String, val => val + "n"));

  // https://github.com/tc39/proposal-decimal
  // https://github.com/babel/babel/pull/11640
  def("DecimalLiteral")
    .bases("Literal")
    .build("value")
    .field("value", String)
    .field(...makeLiteralExtra<N.DecimalLiteral>(String, val => val + "m"));

  def("NullLiteral")
    .bases("Literal")
    .build()
    .field("value", null, defaults["null"]);

  def("BooleanLiteral")
    .bases("Literal")
    .build("value")
    .field("value", Boolean);

  def("RegExpLiteral")
    .bases("Literal")
    .build("pattern", "flags")
    .field("pattern", String)
    .field("flags", String)
    .field("value", RegExp, function (this: N.RegExpLiteral) {
      return new RegExp(this.pattern, this.flags);
    })
    .field(...makeLiteralExtra<N.RegExpLiteral>(
      or(RegExp, isUndefined),
      exp => `/${exp.pattern}/${exp.flags || ""}`,
    ))
    // I'm not sure why this field exists, but it's "specified" by estree:
    // https://github.com/estree/estree/blob/master/es5.md#regexpliteral
    .field("regex", {
      pattern: String,
      flags: String
    }, function (this: N.RegExpLiteral) {
      return {
        pattern: this.pattern,
        flags: this.flags,
      };
    });

  var ObjectExpressionProperty = or(
    def("Property"),
    def("ObjectMethod"),
    def("ObjectProperty"),
    def("SpreadProperty"),
    def("SpreadElement")
  );

  // Split Property -> ObjectProperty and ObjectMethod
  def("ObjectExpression")
    .bases("Expression")
    .build("properties")
    .field("properties", [ObjectExpressionProperty]);

  // ObjectMethod hoist .value properties to own properties
  def("ObjectMethod")
    .bases("Node", "Function")
    .build("kind", "key", "params", "body", "computed")
    .field("kind", or("method", "get", "set"))
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("params", [def("Pattern")])
    .field("body", def("BlockStatement"))
    .field("computed", Boolean, defaults["false"])
    .field("generator", Boolean, defaults["false"])
    .field("async", Boolean, defaults["false"])
    .field("accessibility", // TypeScript
           or(def("Literal"), null),
           defaults["null"])
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  def("ObjectProperty")
    .bases("Node")
    .build("key", "value")
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("value", or(def("Expression"), def("Pattern")))
    .field("accessibility", // TypeScript
           or(def("Literal"), null),
           defaults["null"])
    .field("computed", Boolean, defaults["false"]);

  var ClassBodyElement = or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty"),
    def("ClassPrivateProperty"),
    def("ClassMethod"),
    def("ClassPrivateMethod"),
    def("ClassAccessorProperty"),
    def("StaticBlock"),
  );

  // MethodDefinition -> ClassMethod
  def("ClassBody")
    .bases("Declaration")
    .build("body")
    .field("body", [ClassBodyElement]);

  def("ClassMethod")
    .bases("Declaration", "Function")
    .build("kind", "key", "params", "body", "computed", "static")
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")));

  def("ClassPrivateMethod")
    .bases("Declaration", "Function")
    .build("key", "params", "body", "kind", "computed", "static")
    .field("key", def("PrivateName"));

  def("ClassAccessorProperty")
    .bases("Declaration")
    .build("key", "value", "decorators", "computed", "static")
    .field("key", or(
      def("Literal"),
      def("Identifier"),
      def("PrivateName"),
      // Only when .computed is true (TODO enforce this)
      def("Expression"),
    ))
    .field("value", or(def("Expression"), null), defaults["null"]);

  ["ClassMethod",
   "ClassPrivateMethod",
  ].forEach(typeName => {
    def(typeName)
      .field("kind", or("get", "set", "method", "constructor"), () => "method")
      .field("body", def("BlockStatement"))
      // For backwards compatibility only. Expect accessibility instead (see below).
      .field("access", or("public", "private", "protected", null), defaults["null"])
  });

  ["ClassMethod",
   "ClassPrivateMethod",
   "ClassAccessorProperty",
  ].forEach(typeName => {
    def(typeName)
      .field("computed", Boolean, defaults["false"])
      .field("static", Boolean, defaults["false"])
      .field("abstract", Boolean, defaults["false"])
      .field("accessibility", or("public", "private", "protected", null), defaults["null"])
      .field("decorators", or([def("Decorator")], null), defaults["null"])
      .field("definite", Boolean, defaults["false"])
      .field("optional", Boolean, defaults["false"])
      .field("override", Boolean, defaults["false"])
      .field("readonly", Boolean, defaults["false"]);
  });

  var ObjectPatternProperty = or(
    def("Property"),
    def("PropertyPattern"),
    def("SpreadPropertyPattern"),
    def("SpreadProperty"), // Used by Esprima
    def("ObjectProperty"), // Babel 6
    def("RestProperty"), // Babel 6
    def("RestElement"), // Babel 6
  );

  // Split into RestProperty and SpreadProperty
  def("ObjectPattern")
    .bases("Pattern")
    .build("properties")
    .field("properties", [ObjectPatternProperty])
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  def("SpreadProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

  def("RestProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

  def("ForAwaitStatement")
    .bases("Statement")
    .build("left", "right", "body")
    .field("left", or(
      def("VariableDeclaration"),
      def("Expression")))
    .field("right", def("Expression"))
    .field("body", def("Statement"));

  // The callee node of a dynamic import(...) expression.
  def("Import")
    .bases("Expression")
    .build();
};

maybeSetModuleExports(() => module);
