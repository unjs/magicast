import { describe, expect, it } from "vitest";
import { builders, parseModule } from "magicast";
import { generate } from "../_utils";

describe("builders/raw", () => {
  it("object", async () => {
    const expression = builders.raw("{ foo: 1 }");
    expect(expression.$type).toBe("object");
    expect(expression.foo).toBe(1);
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = {
        foo: 1,
      };"
    `);
  });

  it("identifier", async () => {
    const expression = builders.raw("foo");
    expect(expression.$type).toBe("identifier");
    expect(expression.$name).toBe("foo");
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = foo;"
    `);
  });

  it("identifier as property", async () => {
    const mod = parseModule("");
    mod.exports.default ||= {};
    mod.exports.default.foo = builders.raw("foo");

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: foo,
      };"
    `);
  });

  it("logical expression", async () => {
    const expression = builders.raw("foo || bar");
    expect(expression.$type).toBe("logicalExpression");
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = foo || bar;"
    `);
  });

  it("member expression", async () => {
    const expression = builders.raw("foo.bar");
    expect(expression.$type).toBe("member-expression");
    const mod = parseModule("");
    mod.exports.a = expression;

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = foo.bar;"
    `);
  });
});
