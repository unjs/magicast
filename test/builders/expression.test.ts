import { describe, expect, it } from "vitest";
import { builders, parseModule } from "magicast";
import { generate } from "../_utils";

describe("builders/expression", () => {
  it("new expression", async () => {
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = new Foo(1, \\"bar\\", {
        foo: \\"bar\\",
      });"
    `);
  });
});
