import path from "path";
import fs from "fs";
import { parse as esprimaParse } from "esprima";
import { parse as reifyBabylonParse } from "reify/lib/parsers/babylon";
import { namedTypes as n } from "../main";

export function validateECMAScript(file: any) {
  var fullPath = path.join(__dirname, "..", "..", "src", file);

  it("should validate " + file + " with Esprima", function (done) {
    fs.readFile(fullPath, "utf8", function(err, code) {
      if (err) {
        throw err;
      }

      n.Program.assert(esprimaParse(code), true);
      n.Program.assert(esprimaParse(code, {
        loc: true
      }), true);

      done();
    });
  });

  it("should validate " + file + " with Babylon", function (done) {
    fs.readFile(fullPath, "utf8", function (err, code) {
      if (err) {
        throw err;
      }
      var ast = babylonParse(code);
      n.Program.assert(ast, true);
      done();
    });
  });
};

export function babylonParse(source: any, options?: any) {
  var ast = reifyBabylonParse(source, options);
  if (ast.type === "File") ast = ast.program;
  return ast;
}

export { esprimaParse };

// Helper for determining if we should care that a given type is not defined yet.
// TODO Periodically revisit this as proposals advance.
export function isEarlyStageProposalType(typeName: string) {
  switch (typeName) {
    // The pipeline operator syntax is still at Stage 1:
    // https://github.com/tc39/proposals#stage-1
    case "PipelineTopicExpression":
    case "PipelineBareFunction":
    case "PipelinePrimaryTopicReference":
    // A Babel-specific AST innovation:
    // https://github.com/babel/babel/pull/9364
    case "Placeholder":
    // Partial application proposal (stage 1):
    // https://github.com/babel/babel/pull/9474
    case "ArgumentPlaceholder":
      return true;
    default:
      return false;
  }
}

export function hasNonEmptyErrorsArray(
  value: any
): value is { errors: [any, ...any[]] } {
  return !!(
    value &&
    typeof value === "object" &&
    Array.isArray(value.errors) &&
    value.errors.length > 0
  );
}
