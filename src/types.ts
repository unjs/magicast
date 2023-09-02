import type { Program } from "@babel/types";
import { Options as ParseOptions } from "recast";
import { CodeFormatOptions } from "./format";

export type { Node as ASTNode } from "@babel/types";
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

export interface ParsedFileNode {
  type: "file";
  program: Program;
  loc: Loc;
  comments: null | any;
}

export type GenerateOptions = ParseOptions & {
  format?: false | CodeFormatOptions;
};
