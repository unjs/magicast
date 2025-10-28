import { maybeSetModuleExports } from "../../shared";
import coreOpsDef from "./core";

export default function (fork: import("../../types").Fork) {
  const result = fork.use(coreOpsDef);

  // Exponentiation operators. Must run before BinaryOperators or
  // AssignmentOperators are used (hence before fork.use(es6Def)).
  // https://github.com/tc39/proposal-exponentiation-operator
  if (result.BinaryOperators.indexOf("**") < 0) {
    result.BinaryOperators.push("**");
  }
  if (result.AssignmentOperators.indexOf("**=") < 0) {
    result.AssignmentOperators.push("**=");
  }

  return result;
}

maybeSetModuleExports(() => module);
