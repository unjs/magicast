import { describe, expect, it } from "vitest";
import { builders, generateCode, parseModule } from "magicast";
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

  it("block comment does not throw and is a comment proxy", () => {
    const result = builders.raw("/** foo */");
    expect(result).toBeDefined();
    expect((result as any).$type).toBe("comment");
  });

  it("line comment does not throw and is a comment proxy", () => {
    const result = builders.raw("// line comment");
    expect(result).toBeDefined();
    expect((result as any).$type).toBe("comment");
  });

  it("block comment preserves comment text when inserted into array", () => {
    const mod = parseModule("export default [];");
    (mod.exports.default as any[]).push(builders.raw("/** foo */"));
    expect(generateCode(mod).code).toContain("/** foo */");
  });

  it("jsdoc comment preserves text when inserted into array", () => {
    const mod = parseModule("export default [];");
    (mod.exports.default as any[]).push(builders.raw("/** @type {string} */"));
    expect(generateCode(mod).code).toContain("/** @type {string} */");
  });
});
