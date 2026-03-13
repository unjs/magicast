import { describe, expect, it } from "vitest";
import { builders, generateCode, parseModule } from "magicast";

describe("ConditionalExpression", () => {
  it("builders.raw supports ternary", () => {
    const mod = parseModule("export default {}");
    mod.exports.default.foo = builders.raw("a ? b : c");
    expect(generateCode(mod).code).toContain("foo: a ? b : c");
  });

  it("exposes $test, $consequent, $alternate", () => {
    const expr = builders.raw("a ? b : c");
    expect(expr.$type).toBe("conditional-expression");
    expect(expr.$test.$name).toBe("a");
    expect(expr.$consequent.$name).toBe("b");
    expect(expr.$alternate.$name).toBe("c");
  });
});

describe("unknown AST node fallback", () => {
  it("builders.raw does not throw on unsupported nodes", () => {
    const expr = builders.raw("await foo()");
    expect(expr.$type).toBe("unknown-ast-node");
    expect(generateCode(expr).code).toContain("await foo()");
  });
});
