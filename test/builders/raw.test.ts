import { describe, expect, it } from "vitest";
import { builders, parseModule } from "../../src";
import { generate } from "../_utils";

describe("builders/raw", () => {
  it("object", () => {
    const expression = builders.raw("{ foo: 1 }");
    expect(expression.$type).toBe("object");
    expect(expression.foo).toBe(1);
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a = {
        foo: 1,
      };"
    `);
  });

  it("identifier", () => {
    const expression = builders.raw("foo");
    expect(expression.$type).toBe("identifier");
    expect(expression.$name).toBe("foo");
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a = foo;"
    `);
  });
});
