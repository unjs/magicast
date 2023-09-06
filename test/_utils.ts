import { format } from "prettier";
import { generateCode } from "../src";

export function generate(mod: any) {
  return format(generateCode(mod).code, { parser: "babel-ts" }).then((code) =>
    code.trim(),
  );
}
