import { describe, expect, it } from "vitest";
import { parseCode } from "../src";
import { generate } from "./_utils";

describe("array", () => {
  it("array operations", () => {
    const mod = parseCode(`export default [1, 2, 3, 4, 5]`);

    expect(mod.exports.default.length).toBe(5);
    expect(mod.exports.default.includes(5)).toBe(true);
    expect(mod.exports.default.includes(6)).toBe(false);

    const deleted = mod.exports.default.splice(1, 3, { foo: "bar" }, "bar");

    expect(deleted).toEqual([2, 3, 4]);

    expect(generate(mod)).toMatchInlineSnapshot(
      `
      "export default [
        1,
        {
          foo: \\"bar\\",
        },
        \\"bar\\",
        5,
      ];"
    `
    );

    const foundIndex = mod.exports.default.findIndex(
      (item) => item.foo === "bar"
    );
    const found = mod.exports.default.find((item) => item.foo === "bar");

    expect(foundIndex).toBe(1);
    expect(found).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `);
  });

  it("array should be iterable", () => {
    const mod = parseCode(`
      export const config = {
        array: ['a']
      }
    `);
    const arr = [...mod.exports.config.array];
    expect(arr).toMatchInlineSnapshot(`
      [
        "a",
      ]
    `);
  });
});
