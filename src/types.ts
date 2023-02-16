import * as recast from "recast";

import type { Program } from "@babel/types";
export type { Node as ESNode } from "@babel/types";

export * from "./proxy/types";

export interface Loc {
  start?: { line?: number; column?: number; token?: number };
  end?: { line?: number; column?: number; token?: number };
  lines?: any;
}

export interface Token {
  type: string;
  value: string;
  loc?: Loc;
}

export interface ParsedFileNode extends recast.types.ASTNode {
  type: "file";
  program: Program;
  name?: string;
  loc: Loc;
  comments: null | any;
}
