/**
 * Type annotation defs shared between Flow and TypeScript.
 * These defs could not be defined in ./flow.ts or ./typescript.ts directly
 * because they use the same name.
 */

import { Fork } from "../types";
import typesPlugin from "../types";
import sharedPlugin, { maybeSetModuleExports } from "../shared";

export default function (fork: Fork) {
  var types = fork.use(typesPlugin);
  var def = types.Type.def;
  var or = types.Type.or;
  var defaults = fork.use(sharedPlugin).defaults;

  var TypeAnnotation = or(
    def("TypeAnnotation"),
    def("TSTypeAnnotation"),
    null
  );

  var TypeParamDecl = or(
    def("TypeParameterDeclaration"),
    def("TSTypeParameterDeclaration"),
    null
  );

  def("Identifier")
    .field("typeAnnotation", TypeAnnotation, defaults["null"]);

  def("ObjectPattern")
    .field("typeAnnotation", TypeAnnotation, defaults["null"]);

  def("Function")
    .field("returnType", TypeAnnotation, defaults["null"])
    .field("typeParameters", TypeParamDecl, defaults["null"]);

  def("ClassProperty")
    .build("key", "value", "typeAnnotation", "static")
    .field("value", or(def("Expression"), null))
    .field("static", Boolean, defaults["false"])
    .field("typeAnnotation", TypeAnnotation, defaults["null"]);

  ["ClassDeclaration",
   "ClassExpression",
  ].forEach(typeName => {
    def(typeName)
      .field("typeParameters", TypeParamDecl, defaults["null"])
      .field("superTypeParameters",
             or(def("TypeParameterInstantiation"),
                def("TSTypeParameterInstantiation"),
                null),
             defaults["null"])
      .field("implements",
             or([def("ClassImplements")],
                [def("TSExpressionWithTypeArguments")]),
             defaults.emptyArray);
  });
};

maybeSetModuleExports(() => module);
