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
});
