import { describe, expect, it } from "vitest";
import { builder, parseCode } from "../src";
import { generate } from "./_utils";

describe("builder", () => {
  it("functionCall", () => {
    const call = builder.functionCall("functionName", 1, "bar", { foo: "bar" });
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

    const mod = parseCode("");
    mod.exports.a = call;

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a = functionName(1, \\"bar\\", {
        foo: \\"bar\\",
      });"
    `);
  });
});
