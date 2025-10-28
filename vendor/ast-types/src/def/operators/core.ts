import { maybeSetModuleExports } from "../../shared";

export default function () {
  return {
    BinaryOperators: [
      "==", "!=", "===", "!==",
      "<", "<=", ">", ">=",
      "<<", ">>", ">>>",
      "+", "-", "*", "/", "%",
      "&",
      "|", "^", "in",
      "instanceof",
    ],

    AssignmentOperators: [
      "=", "+=", "-=", "*=", "/=", "%=",
      "<<=", ">>=", ">>>=",
      "|=", "^=", "&=",
    ],

    LogicalOperators: [
      "||", "&&",
    ],
  };
}

maybeSetModuleExports(() => module);
