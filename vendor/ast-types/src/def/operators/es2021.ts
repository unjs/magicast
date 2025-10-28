import { maybeSetModuleExports } from "../../shared";
import es2020OpsDef from "./es2020";

export default function (fork: import("../../types").Fork) {
  const result = fork.use(es2020OpsDef);

  // Logical assignment operators. Must run before AssignmentOperators is used.
  // https://github.com/tc39/proposal-logical-assignment
  result.LogicalOperators.forEach(op => {
    const assignOp = op + "=";
    if (result.AssignmentOperators.indexOf(assignOp) < 0) {
      result.AssignmentOperators.push(assignOp);
    }
  });

  return result;
}

maybeSetModuleExports(() => module);
