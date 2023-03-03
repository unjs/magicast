import { describe, expect, it } from "vitest";
import { parseModule } from "../src";
import { generate } from "./_utils";

describe("object", () => {
  it("object property", () => {
    const mod = parseModule(
      `
export default {
  foo: {
    ['a']: 1,
    ['a-b']: 2,
    foo() {}
  }
}
    `.trim()
    );

    expect(mod.exports.default.foo.a).toBe(1);
    expect(mod.exports.default.foo["a-b"]).toBe(2);
    expect(Object.keys(mod.exports.default.foo)).toMatchInlineSnapshot(`
      [
        "a",
        "a-b",
        "foo",
      ]
    `);

    mod.exports.default.foo["a-b-c"] = 3;

    expect(Object.keys(mod.exports.default.foo)).toMatchInlineSnapshot(`
      [
        "a",
        "a-b",
        "foo",
        "a-b-c",
      ]
    `);

    mod.exports.default.foo["a-b"] = "updated";

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          [\\"a\\"]: 1,
          [\\"a-b\\"]: \\"updated\\",
          foo() {},
          \\"a-b-c\\": 3,
        },
      };"
    `);
  });
});
