import * as recast from "recast";
import { Program, CommentBlock, CommentLine } from "@babel/types";
import type { ProxifiedModule } from "./types";
import { createProxy, literalToAst } from "./_utils";
import { proxify } from "./proxify";
import { getPropName } from "./object";
import { ASTNode } from "magicast";

const b = recast.types.builders;

export function createExportsProxy(root: Program, mod: ProxifiedModule) {
  const findExport = (key: string) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          return n.declaration;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            return dec.init as any;
          }
        }
      }
    }
  };

  const updateOrAddExport = (key: string, value: any) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    const node = literalToAst(value) as any;
    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          n.declaration = node;
          return;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            dec.init = node;
            return;
          }
        }
      }
    }

    root.body.push(
      key === "default"
        ? b.exportDefaultDeclaration(node)
        : (b.exportNamedDeclaration(
            b.variableDeclaration("const", [
              b.variableDeclarator(b.identifier(key), node),
            ]),
          ) as any),
    );
  };

  const proxifyComment = new Proxy(
    {},
    {
      get(target, p, receiver) {
        const node = findExport(p) as ASTNode;
        switch (node.type) {
          case "ObjectExpression": {
            return new Proxy(
              {},
              {
                set(_, key, value) {
                  const prop = (node.properties as any[]).find(
                    (p: any) => getPropName(p) === key,
                  );
                  prop.comments = [b.commentBlock(value, true, false)];
                  return true;
                },
                get(_, key) {
                  const prop = (node.properties as any[]).find(
                    (p: any) => getPropName(p) === key,
                  );
                  if (!prop) {
                    return;
                  }

                  if (
                    [
                      "ObjectExpression",
                      "ObjectPattern",
                      "ObjectTypeAnnotation",
                      "RecordExpression",
                    ].includes(prop.value.type)
                  ) {
                    return proxify(prop.value, mod);
                    // return prop
                  }
                  return prop.comments
                    ?.map(
                      (comment: CommentBlock | CommentLine) => comment.value,
                    )
                    .join("\n");
                },
              },
            );
          }
        }
      },
    },
  );

  return createProxy(
    root,
    {
      $type: "exports",
      $comment: proxifyComment,
    },
    {
      get(_, prop) {
        const node = findExport(prop as string);
        if (node) {
          console.info(node.type, `export ${String(prop)}`);
          return proxify(node, mod);
        }
      },
      set(_, prop, value) {
        updateOrAddExport(prop as string, value);
        return true;
      },
      ownKeys() {
        return root.body
          .flatMap((i) => {
            if (i.type === "ExportDefaultDeclaration") {
              return ["default"];
            }
            if (
              i.type === "ExportNamedDeclaration" &&
              i.declaration &&
              "declarations" in i.declaration
            ) {
              return i.declaration.declarations.map((d) =>
                "name" in d.id ? d.id.name : "",
              );
            }
            return [];
          })
          .filter(Boolean);
      },
      deleteProperty(_, prop) {
        const type =
          prop === "default"
            ? "ExportDefaultDeclaration"
            : "ExportNamedDeclaration";

        for (let i = 0; i < root.body.length; i++) {
          const n = root.body[i];
          if (n.type === type) {
            if (prop === "default") {
              root.body.splice(i, 1);
              return true;
            }
            if (n.declaration && "declarations" in n.declaration) {
              const dec = n.declaration.declarations[0];
              if ("name" in dec.id && dec.id.name === prop) {
                root.body.splice(i, 1);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  );
}
