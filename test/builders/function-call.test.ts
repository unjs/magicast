import { describe, expect, it } from "vitest";
import { generate } from "../_utils";
import { builders, parseModule } from "magicast";

describe("builders/functionCall", () => {
  it("new", async () => {
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export const a = functionName(1, \\"bar\\", {
        foo: \\"bar\\",
      });"
    `);
  });
});
