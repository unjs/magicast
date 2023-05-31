import { describe, expect, it } from "vitest";
import { parseModule } from "../src";
import { deepMergeObject } from "../src/helpers/deep-merge";
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

  it("recursively create objects", () => {
    const mod = parseModule(
      `
export default {
  foo: {
  }
}
    `.trim()
    );

    // Update existing object keys
    expect(mod.exports.default.foo).toEqual({});
    mod.exports.default.foo.value = 1;
    expect(mod.exports.default.foo.value).toEqual(1);

    // Create nested object
    mod.exports.default.bar = {};
    mod.exports.default.bar.testValue = {};
    mod.exports.default.bar.testValue.value = "a";

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          value: 1,
        },

        bar: {
          testValue: {
            value: \\"a\\",
          },
        },
      };"
    `);
  });

  it("recursively merge objects", () => {
    const mod = parseModule(
      `
export default {
  foo: {
  },
  100: 10,
  true: 10
}
    `.trim()
    );

    const obj = {
      foo: {
        value: 1,
      },

      bar: {
        testValue: {
          value: "a",
        },
      },

      100: 20,

      true: 20,
    };

    // Recursively merge existing object with `obj`
    deepMergeObject(mod.exports.default, obj);

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          value: 1,
        },

        100: 20,
        true: 20,

        bar: {
          testValue: {
            value: \\"a\\",
          },
        },
      };"
    `);
  });
});
