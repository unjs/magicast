import * as recast from "recast";
import type { Node as ESNode } from "estree";
export type { Node as ESNode } from "estree";

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

export interface ProgramNode extends recast.types.ASTNode {
  type: "Program";
  body: ESNode[];
  sourceType: "script" | "module";
  loc: Loc;
  errors: any[];
}

export interface ParsedFileNode extends recast.types.ASTNode {
  type: "file";
  program: ProgramNode;
  name?: string;
  loc: Loc;
  comments: null | any;
}
