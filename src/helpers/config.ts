import { Program, VariableDeclarator } from "@babel/types";
import { generateCode, parseExpression } from "../core";
import { MagicastError } from "../error";
import type { Proxified, ProxifiedModule, ProxifiedObject } from "../types";

export function getDefaultExportOptions(magicast: ProxifiedModule<any>) {
  return configFromNode(magicast.exports.default);
}

/**
 * Returns the vite config object from a variable declaration thats
 * exported as the default export.
 *
 * Example:
 *
 * ```js
 * const config = {};
 * export default config;
 * ```
 *
 * @param magicast the module
 *
 * @returns an object containing the proxified config object and the
 *          declaration "parent" to attach the modified config to later.
 *          If no config declaration is found, undefined is returned.
 */
export function getConfigFromVariableDeclaration(
  magicast: ProxifiedModule<any>,
): {
  declaration: VariableDeclarator;
  config: ProxifiedObject<any> | undefined;
} {
  if (magicast.exports.default.$type !== "identifier") {
    throw new MagicastError(
      `Not supported: Cannot modify this kind of default export (${magicast.exports.default.$type})`,
    );
  }

  const configDecalarationId = magicast.exports.default.$name;

  for (const node of (magicast.$ast as Program).body) {
    if (node.type === "VariableDeclaration") {
      for (const declaration of node.declarations) {
        if (
          declaration.id.type === "Identifier" &&
          declaration.id.name === configDecalarationId &&
          declaration.init
        ) {
          const init =
            declaration.init.type === "TSSatisfiesExpression"
              ? declaration.init.expression
              : declaration.init;

          const code = generateCode(init).code;
          const configExpression = parseExpression(code);

          return {
            declaration,
            config: configFromNode(configExpression),
          };
        }
      }
    }
  }
  throw new MagicastError("Couldn't find config declaration");
}

function configFromNode(node: Proxified<any>): ProxifiedObject<any> {
  if (node.$type === "function-call") {
    return node.$args[0];
  }
  return node;
}
