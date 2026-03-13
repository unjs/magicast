import { describe, expect, it } from "vitest";
import { builders, generateCode } from "magicast";

describe("unknown-ast-node", () => {
  const cases = [
    ["AwaitExpression", "await foo()"],
    ["UnaryExpression", "typeof foo"],
    ["UnaryExpression", "!foo"],
    ["UpdateExpression", "i++"],
    ["TemplateLiteral", "`hello ${world}`"],
    ["AssignmentExpression", "a = b"],
  ];

  it.each(cases)("proxifies %s: %s", (_, code) => {
    const expr = builders.raw(code);
    expect(expr.$type).toBe("unknown-ast-node");
    expect(expr.$ast).toBeDefined();
  });

  it.each(cases)("generates code for %s: %s", (_, code) => {
    const expr = builders.raw(code);
    expect(generateCode(expr).code).toContain(code);
  });
});
