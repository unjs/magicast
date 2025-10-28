import fs from "fs";
import path from "path";
import { prettyPrint } from "recast";
import {
  Type,
  builders as b,
  namedTypes as n,
  getBuilderName,
} from "../src/main";

const Op = Object.prototype;
const hasOwn = Op.hasOwnProperty;

const RESERVED_WORDS: { [reservedWord: string]: boolean | undefined } = {
  extends: true,
  default: true,
  arguments: true,
  static: true,
};

const NAMED_TYPES_ID = b.identifier("namedTypes");
const NAMED_TYPES_IMPORT = b.importDeclaration(
  [b.importSpecifier(NAMED_TYPES_ID)],
  b.stringLiteral("./namedTypes"),
);

const KINDS_ID = b.identifier("K");
const KINDS_IMPORT = b.importDeclaration(
  [b.importNamespaceSpecifier(KINDS_ID)],
  b.stringLiteral("./kinds")
);

const supertypeToSubtypes = getSupertypeToSubtypes();
const builderTypeNames = getBuilderTypeNames();

const out = [
  {
    file: "kinds.ts",
    ast: moduleWithBody([
      NAMED_TYPES_IMPORT,
      ...Object.keys(supertypeToSubtypes).map(supertype => {
        const buildableSubtypes = getBuildableSubtypes(supertype);
        if (buildableSubtypes.length === 0) {
          // Some of the XML* types don't have buildable subtypes,
          // so fall back to using the supertype's node type
          return b.exportNamedDeclaration(
            b.tsTypeAliasDeclaration(
              b.identifier(`${supertype}Kind`),
              b.tsTypeReference(b.tsQualifiedName(NAMED_TYPES_ID, b.identifier(supertype)))
            )
          );
        }

        return b.exportNamedDeclaration(
          b.tsTypeAliasDeclaration(
            b.identifier(`${supertype}Kind`),
            b.tsUnionType(buildableSubtypes.map(subtype =>
              b.tsTypeReference(b.tsQualifiedName(NAMED_TYPES_ID, b.identifier(subtype)))
            ))
          )
        );
      }),
    ]),
  },
  {
    file: "namedTypes.ts",
    ast: moduleWithBody([
      b.importDeclaration([
        b.importSpecifier(b.identifier("Type")),
        b.importSpecifier(b.identifier("Omit")),
      ], b.stringLiteral("../types")),
      KINDS_IMPORT,
      b.exportNamedDeclaration(
        b.tsModuleDeclaration(
          b.identifier("namedTypes"),
          b.tsModuleBlock([
            ...Object.keys(n).map(typeName => {
              const typeDef = Type.def(typeName);
              const ownFieldNames = Object.keys(typeDef.ownFields);

              return b.exportNamedDeclaration(
                b.tsInterfaceDeclaration.from({
                  id: b.identifier(typeName),
                  extends: typeDef.baseNames.map(baseName => {
                    const baseDef = Type.def(baseName);
                    const commonFieldNames = ownFieldNames
                      .filter(fieldName => !!baseDef.allFields[fieldName]);

                    if (commonFieldNames.length > 0) {
                      return b.tsExpressionWithTypeArguments(
                        b.identifier("Omit"),
                        b.tsTypeParameterInstantiation([
                          b.tsTypeReference(b.identifier(baseName)),
                          b.tsUnionType(
                            commonFieldNames.map(fieldName =>
                              b.tsLiteralType(b.stringLiteral(fieldName))
                            )
                          ),
                        ])
                      );
                    } else {
                      return b.tsExpressionWithTypeArguments(b.identifier(baseName));
                    }
                  }),
                  body: b.tsInterfaceBody(
                    ownFieldNames.map(fieldName => {
                      const field = typeDef.allFields[fieldName];

                      if (field.name === "type" && field.defaultFn) {
                        return b.tsPropertySignature(
                          b.identifier("type"),
                          b.tsTypeAnnotation(b.tsLiteralType(b.stringLiteral(field.defaultFn())))
                        );
                      } else if (field.defaultFn) {
                        return b.tsPropertySignature(
                          b.identifier(field.name),
                          b.tsTypeAnnotation(getTSTypeAnnotation(field.type)),
                          true, // optional
                        );
                      }

                      return b.tsPropertySignature(
                        b.identifier(field.name),
                        b.tsTypeAnnotation(getTSTypeAnnotation(field.type))
                      );
                    })
                  ),
                })
              );
            }),

            b.exportNamedDeclaration(
              b.tsTypeAliasDeclaration(
                b.identifier("ASTNode"),
                b.tsUnionType(
                  Object.keys(n)
                    .filter(typeName => Type.def(typeName).buildable)
                    .map(typeName => b.tsTypeReference(b.identifier(typeName))),
                )
              )
            ),

            ...Object.keys(n).map(typeName =>
              b.exportNamedDeclaration(
                b.variableDeclaration("let", [
                  b.variableDeclarator(
                    b.identifier.from({
                      name: typeName,
                      typeAnnotation: b.tsTypeAnnotation(
                        b.tsTypeReference(
                          b.identifier("Type"),
                          b.tsTypeParameterInstantiation([
                            b.tsTypeReference(
                              b.identifier(typeName),
                            ),
                          ]),
                        ),
                      ),
                    }),
                  ),
                ]),
              ),
            ),
          ]),
        )
      ),
      b.exportNamedDeclaration(
        b.tsInterfaceDeclaration(
          b.identifier("NamedTypes"),
          b.tsInterfaceBody(
            Object.keys(n).map(typeName =>
              b.tsPropertySignature(
                b.identifier(typeName),
                b.tsTypeAnnotation(
                  b.tsTypeReference(
                    b.identifier("Type"),
                    b.tsTypeParameterInstantiation([
                      b.tsTypeReference(b.tsQualifiedName(
                        b.identifier("namedTypes"),
                        b.identifier(typeName),
                      )),
                    ])
                  )
                )
              )
            )
          )
        )
      ),
    ]),
  },
  {
    file: "builders.ts",
    ast: moduleWithBody([
      KINDS_IMPORT,
      NAMED_TYPES_IMPORT,
      ...builderTypeNames.map(typeName => {
        const typeDef = Type.def(typeName);

        const returnType = b.tsTypeAnnotation(
          b.tsTypeReference(b.tsQualifiedName(NAMED_TYPES_ID, b.identifier(typeName)))
        );

        const buildParamAllowsUndefined: { [buildParam: string]: boolean } = {};
        const buildParamIsOptional: { [buildParam: string]: boolean } = {};
        [...typeDef.buildParams].reverse().forEach((cur, i, arr) => {
          const field = typeDef.allFields[cur];
          if (field && field.defaultFn) {
            if (i === 0) {
              buildParamIsOptional[cur] = true;
            } else {
              if (buildParamIsOptional[arr[i - 1]]) {
                buildParamIsOptional[cur] = true;
              } else {
                buildParamAllowsUndefined[cur] = true;
              }
            }
          }
        });

        return b.exportNamedDeclaration(
          b.tsInterfaceDeclaration(
            b.identifier(`${typeName}Builder`),
            b.tsInterfaceBody([
              b.tsCallSignatureDeclaration(
                typeDef.buildParams
                  .filter(buildParam => !!typeDef.allFields[buildParam])
                  .map(buildParam => {
                    const field = typeDef.allFields[buildParam];
                    const name = RESERVED_WORDS[buildParam] ? `${buildParam}Param` : buildParam;

                    return b.identifier.from({
                      name,
                      typeAnnotation: b.tsTypeAnnotation(
                        !!buildParamAllowsUndefined[buildParam]
                          ? b.tsUnionType([getTSTypeAnnotation(field.type), b.tsUndefinedKeyword()])
                          : getTSTypeAnnotation(field.type)
                      ),
                      optional: !!buildParamIsOptional[buildParam],
                    });
                  }),
                returnType
              ),
              b.tsMethodSignature(
                b.identifier("from"),
                [
                  b.identifier.from({
                    name: "params",
                    typeAnnotation: b.tsTypeAnnotation(
                      b.tsTypeLiteral(
                        Object.keys(typeDef.allFields)
                          .filter(fieldName => fieldName !== "type")
                          .sort() // Sort field name strings lexicographically.
                          .map(fieldName => {
                            const field = typeDef.allFields[fieldName];
                            return b.tsPropertySignature(
                              b.identifier(field.name),
                              b.tsTypeAnnotation(getTSTypeAnnotation(field.type)),
                              field.defaultFn != null || field.hidden
                            );
                          })
                      )
                    ),
                  }),
                ],
                returnType
              ),
            ])
          )
        );
      }),

      b.exportNamedDeclaration(
        b.tsInterfaceDeclaration(
          b.identifier("builders"),
          b.tsInterfaceBody([
            ...builderTypeNames.map(typeName =>
              b.tsPropertySignature(
                b.identifier(getBuilderName(typeName)),
                b.tsTypeAnnotation(b.tsTypeReference(b.identifier(`${typeName}Builder`)))
              )
            ),
            b.tsIndexSignature(
              [
                b.identifier.from({
                  name: "builderName",
                  typeAnnotation: b.tsTypeAnnotation(b.tsStringKeyword()),
                }),
              ],
              b.tsTypeAnnotation(b.tsAnyKeyword())
            ),
          ])
        )
      ),
    ]),
  },
  {
    file: "visitor.ts",
    ast: moduleWithBody([
      b.importDeclaration(
        [b.importSpecifier(b.identifier("NodePath"))],
        b.stringLiteral("../node-path")
      ),
      b.importDeclaration(
        [b.importSpecifier(b.identifier("Context"))],
        b.stringLiteral("../path-visitor")
      ),
      NAMED_TYPES_IMPORT,
      b.exportNamedDeclaration(
        b.tsInterfaceDeclaration.from({
          id: b.identifier("Visitor"),
          typeParameters: b.tsTypeParameterDeclaration([
            b.tsTypeParameter("M", undefined, b.tsTypeLiteral([])),
          ]),
          body: b.tsInterfaceBody([
            ...Object.keys(n).map(typeName => {
              return b.tsMethodSignature.from({
                key: b.identifier(`visit${typeName}`),
                parameters: [
                  b.identifier.from({
                    name: "this",
                    typeAnnotation: b.tsTypeAnnotation(
                      b.tsIntersectionType([
                        b.tsTypeReference(b.identifier("Context")),
                        b.tsTypeReference(b.identifier("M")),
                      ])
                    ),
                  }),
                  b.identifier.from({
                    name: "path",
                    typeAnnotation: b.tsTypeAnnotation(
                      b.tsTypeReference(
                        b.identifier("NodePath"),
                        b.tsTypeParameterInstantiation([
                          b.tsTypeReference(b.tsQualifiedName(NAMED_TYPES_ID, b.identifier(typeName))),
                        ])
                      )
                    ),
                  }),
                ],
                optional: true,
                typeAnnotation: b.tsTypeAnnotation(b.tsAnyKeyword()),
              });
            }),
          ]),
        })
      ),
    ]),
  },
];

out.forEach(({ file, ast }) => {
  fs.writeFileSync(
    path.resolve(__dirname, `../src/gen/${file}`),
    prettyPrint(ast, { tabWidth: 2, includeComments: true }).code
  );
});

function moduleWithBody(body: any[]) {
  return b.file.from({
    comments: [b.commentBlock(" !!! THIS FILE WAS AUTO-GENERATED BY `npm run gen` !!! ")],
    program: b.program(body),
  });
}

function getSupertypeToSubtypes() {
  const supertypeToSubtypes: { [supertypeName: string]: string[] } = {};
  Object.keys(n).map(typeName => {
    Type.def(typeName).supertypeList.forEach(supertypeName => {
      supertypeToSubtypes[supertypeName] = supertypeToSubtypes[supertypeName] || [];
      supertypeToSubtypes[supertypeName].push(typeName);
    });
  });

  return supertypeToSubtypes;
}

function getBuilderTypeNames() {
  return Object.keys(n).filter(typeName => {
    const typeDef = Type.def(typeName);
    const builderName = getBuilderName(typeName);

    return !!typeDef.buildParams && !!(b as any)[builderName];
  });
}

function getBuildableSubtypes(supertype: string): string[] {
  return Array.from(new Set(
    Object.keys(n).filter(typeName => {
      const typeDef = Type.def(typeName);
      return typeDef.allSupertypes[supertype] != null && typeDef.buildable;
    })
  ));
}

function getTSTypeAnnotation(type: import("../src/types").Type<any>): any {
  switch (type.kind) {
    case "ArrayType": {
      const elemTypeAnnotation = getTSTypeAnnotation(type.elemType);
      // TODO Improve this test.
      return n.TSUnionType.check(elemTypeAnnotation)
        ? b.tsArrayType(b.tsParenthesizedType(elemTypeAnnotation))
        : b.tsArrayType(elemTypeAnnotation);
    }

    case "IdentityType": {
      if (type.value === null) {
        return b.tsNullKeyword();
      }
      switch (typeof type.value) {
        case "undefined":
          return b.tsUndefinedKeyword();
        case "string":
          return b.tsLiteralType(b.stringLiteral(type.value));
        case "boolean":
          return b.tsLiteralType(b.booleanLiteral(type.value));
        case "number":
          return b.tsNumberKeyword();
        case "object":
          return b.tsObjectKeyword();
        case "function":
          return b.tsFunctionType([]);
        case "symbol":
          return b.tsSymbolKeyword();
        default:
          return b.tsAnyKeyword();
      }
    }

    case "ObjectType": {
      return b.tsTypeLiteral(
        type.fields.map(field =>
          b.tsPropertySignature(
            b.identifier(field.name),
            b.tsTypeAnnotation(getTSTypeAnnotation(field.type))
          )
        )
      );
    }

    case "OrType": {
      return b.tsUnionType(type.types.map(type => getTSTypeAnnotation(type)));
    }

    case "PredicateType": {
      if (typeof type.name !== "string") {
        return b.tsAnyKeyword();
      }

      if (hasOwn.call(n, type.name)) {
        return b.tsTypeReference(b.tsQualifiedName(KINDS_ID, b.identifier(`${type.name}Kind`)));
      }

      if (/^[$A-Z_][a-z0-9_$]*$/i.test(type.name)) {
        return b.tsTypeReference(b.identifier(type.name));
      }

      if (/^number [<>=]+ \d+$/.test(type.name)) {
        return b.tsNumberKeyword();
      }

      // Not much else to do...
      return b.tsAnyKeyword();
    }

    default:
      return assertNever(type);
  }
}

function assertNever(x: never): never {
  throw new Error("Unexpected: " + x);
}
