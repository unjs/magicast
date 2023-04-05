import { describe, expect, it } from "vitest";
import { builders, parseModule } from "../src";
import { generate } from "./_utils";

describe("builders", () => {
  it("functionCall", () => {
    const call = builders.functionCall("functionName", 1, "bar", {
      foo: "bar",
    });
    expect(call.$type).toBe("function-call");
    expect(call.$callee).toBe("functionName");
    expect(call.$args).toMatchInlineSnapshot(`
      [
        1,
        "bar",
        {
          "foo": "bar",
        },
      ]
    `);

    const mod = parseModule("");
    mod.exports.a = call;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a = functionName(1, \\"bar\\", {
        foo: \\"bar\\",
      });"
    `);
  });

  it("new expression", () => {
    const call = builders.newExpression("Foo", 1, "bar", {
      foo: "bar",
    });
    expect(call.$type).toBe("new-expression");
    expect(call.$callee).toBe("Foo");
    expect(call.$args).toMatchInlineSnapshot(`
      [
        1,
        "bar",
        {
          "foo": "bar",
        },
      ]
    `);

    const mod = parseModule("");
    mod.exports.a = call;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a = new Foo(1, \\"bar\\", {
        foo: \\"bar\\",
      });"
    `);
  });

  it("raw", () => {
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
});
