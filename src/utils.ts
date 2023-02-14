import { parseCode } from "./code";
import { GenericNode } from "./ast";
import type { ParsedFileNode, ESNode } from "./types";
import * as recast from "recast";


export const builders = recast.types.builders;

const literalTypes = new Set(['string', 'number', 'boolean', 'RegExp', 'undefined', 'BigInt']);

export function createNode(input: any): GenericNode {
  // TODO: Use symbol to detect
  if (input instanceof GenericNode) {
    return input;
  }

  // Literal types
  const type = typeof input;
  if (literalTypes.has(type)) {
    return new GenericNode(builders.literal(input) as ESNode);
  }

  // More complex types
  const serialized = type === 'function' ? input.toString() : JSON.stringify(input);
  return parseCode('export default ' + serialized).exports.default
}
