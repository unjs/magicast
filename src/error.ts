import { ESNode } from "./types";

export interface MagicastErrorOptions {
  ast?: ESNode;
  code?: string;
}

export class MagicastError extends Error {
  rawMessage: string;
  options?: MagicastErrorOptions;

  constructor(message: string, options?: MagicastErrorOptions) {
    super("");
    this.name = "MagicastError";
    this.rawMessage = message;
    this.options = options;

    if (options?.ast && options?.code && options.ast.loc) {
      // construct a code frame point to the start of the ast node
      const { line, column } = options.ast.loc.start;
      const lines = options.code.split("\n");
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 3);
      const codeFrame = lines.slice(start, end).map((lineCode, i) => {
        const number = (start + i + 1).toString().padStart(3, " ");
        lineCode = `${number} | ${lineCode}`;
        if (start + i === line - 1) {
          lineCode += `\n${" ".repeat(6 + column)}^`;
        }
        return lineCode;
      });

      message += `\n\n${codeFrame.join("\n")}\n`;
    }

    this.message = message;
  }
}
