import { describe, expect, it } from "vitest";
import { parseModule } from "../src";
import { deepMergeObject } from "../src/helpers/deep-merge";
import { generate } from "./_utils";

describe("object", () => {
  it("object property", async () => {
    const mod = parseModule(
      `
export default {
  foo: {
    ['a']: 1,
    ['a-b']: 2,
    foo() {},
    1: 3,
    [true]: 4,
    "c": { key: 5 },
    'd': { key: 6 },
  }
}
    `.trim(),
    );

    expect(mod.exports.default.foo.a).toBe(1);
    expect(mod.exports.default.foo["a-b"]).toBe(2);
    expect(mod.exports.default.foo[1]).toBe(3);
    expect(mod.exports.default.foo.true).toBe(4);
    expect(mod.exports.default.foo.c?.key).toBe(5);
    expect(mod.exports.default.foo.d?.key).toBe(6);
    expect(Object.keys(mod.exports.default.foo)).toMatchInlineSnapshot(`
      [
        "a",
        "a-b",
        "foo",
        "1",
        "true",
        "c",
        "d",
      ]
    `);

    mod.exports.default.foo["a-b-c"] = 3;

    expect(Object.keys(mod.exports.default.foo)).toMatchInlineSnapshot(`
      [
        "a",
        "a-b",
        "foo",
        "1",
        "true",
        "c",
        "d",
        "a-b-c",
      ]
    `);

    mod.exports.default.foo["a-b"] = "updated";

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          ["a"]: 1,
          ["a-b"]: "updated",
          foo() {},
          1: 3,
          [true]: 4,
          c: { key: 5 },
          d: { key: 6 },
          "a-b-c": 3,
        },
      };"
    `);
  });

  it("recursively create objects", async () => {
    const mod = parseModule(
      `
export default {
  foo: {
  }
}
    `.trim(),
    );

    // Update existing object keys
    expect(mod.exports.default.foo).toEqual({});
    mod.exports.default.foo.value = 1;
    expect(mod.exports.default.foo.value).toEqual(1);

    // Create nested object
    mod.exports.default.bar = {};
    mod.exports.default.bar.testValue = {};
    mod.exports.default.bar.testValue.value = "a";

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          value: 1,
        },

        bar: {
          testValue: {
            value: "a",
          },
        },
      };"
    `);
  });

  it("recursively merge objects", async () => {
    const mod = parseModule(
      `
export default {
  foo: {
  },
  100: 10,
  true: 10
}
    `.trim(),
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

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          value: 1,
        },

        100: 20,
        true: 20,

        bar: {
          testValue: {
            value: "a",
          },
        },
      };"
    `);
  });

  it("object keys camelCase style", async () => {
    const mod = parseModule(`export default defineAppConfig({
      test: {
        foo: 1,
      }
    })`);

    const config =
      mod.exports.default.$type === "function-call"
        ? mod.exports.default.$args[0]
        : mod.exports.default;

    const obj1 = { kebabCase: 1 };

    deepMergeObject(config, obj1);

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default defineAppConfig({
        test: {
          foo: 1,
        },

        kebabCase: 1,
      });"
    `);

    const obj2 = { kebabCaseParent: { kebabCaseChild: 1 } };

    deepMergeObject(config, obj2);

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default defineAppConfig({
        test: {
          foo: 1,
        },

        kebabCase: 1,

        kebabCaseParent: {
          kebabCaseChild: 1,
        },
      });"
    `);
  });

  it("object keys kebab-case style", async () => {
    const mod = parseModule(`export default defineAppConfig({
      test: {
        foo: 1,
      }
    })`);

    const config =
      mod.exports.default.$type === "function-call"
        ? mod.exports.default.$args[0]
        : mod.exports.default;

    const obj1 = { "kebab-case": 1 };

    deepMergeObject(config, obj1);

    // Valid
    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default defineAppConfig({
        test: {
          foo: 1,
        },

        "kebab-case": 1,
      });"
    `);

    const obj2 = { "kebab-case-parent": { "kebab-case-child": 1 } };

    deepMergeObject(config, obj2);

    // TODO: Should be valid
    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default defineAppConfig({
        test: {
          foo: 1,
        },

        "kebab-case": 1,

        "kebab-case-parent": {
          "kebab-case-child": 1,
        },
      });"
    `);
  });
  it("binary expressions inside functions and arrow functions inside object array", async () => {
    const mod = parseModule(`
        export default {
          x: [{
            pattern: ({ req }) => req.method === 'GET'
          },{
            pattern({ req }) { return req.method === 'GET' }
          },{
            pattern: async ({ req }) => req.method === 'GET'
          },{
            async pattern({ req }) { return req.method === 'GET' }
          }]
      }
      `);
    expect(typeof mod.exports.default.x[0].pattern).toBe("function");
    expect(
      await generate(mod.exports.default.x[0].pattern),
    ).toMatchInlineSnapshot(`"({ req }) => req.method === "GET";"`);
    expect(typeof mod.exports.default.x[1].pattern).toBe("function");
    expect(await generate(mod.exports.default.x[1].pattern))
      .toMatchInlineSnapshot(`
        "(function ({ req }) {
          return req.method === "GET";
        });"
      `);
    expect(typeof mod.exports.default.x[2].pattern).toBe("function");
    expect(
      await generate(mod.exports.default.x[2].pattern),
    ).toMatchInlineSnapshot(`"async ({ req }) => req.method === "GET";"`);
    expect(typeof mod.exports.default.x[2].pattern).toBe("function");
    expect(
      await generate(mod.exports.default.x[3].pattern),
    ).toMatchInlineSnapshot(`
      "(async function ({ req }) {
        return req.method === "GET";
      });"
    `);
  });

  it("object property with RegExp", async () => {
    const mod = parseModule(
      `export default { urlPattern: /\\/api\\/pwa\\/.*/ }`,
    );

    const urlPattern = mod.exports.default.urlPattern;
    expect(typeof urlPattern).toBe("object");
    expect(urlPattern).toBeInstanceOf(RegExp);
    // eslint-disable-next-line unicorn/prefer-string-raw
    expect(urlPattern.source).toBe("\\/api\\/pwa\\/.*");

    mod.exports.default.urlPattern = /\/api\/pwa\/v1\/.*/;

    expect(await generate(mod)).toMatchInlineSnapshot(
      `"export default { urlPattern: /\\/api\\/pwa\\/v1\\/.*/ };"`,
    );
  });

  it("proxified array should be an array", async () => {
    const mod = parseModule(`export default { myArray: [1, "a"] }`);

    const myArray = mod.exports.default.myArray;
    expect(Array.isArray(myArray)).toBe(true);

    myArray.push(true);

    expect(await generate(mod)).toMatchInlineSnapshot(
      `"export default { myArray: [1, "a", true] };"`,
    );
  });

  it("object destructuring", () => {
    const mod = parseModule(
      `
export default {
  foo: {
    a: 1,
    ...bar
  }
}
    `.trim(),
    );

    // Destructuring should now work and only copy own properties
    const newObj = { ...mod.exports.default.foo };
    expect(newObj).toEqual({ a: 1 });
  });
  it("object introspection with Object.keys and in operator", () => {
    const mod = parseModule(`export default { a: 1, b: 'foo' }`);
    const proxy = mod.exports.default;

    expect(Object.keys(proxy)).toEqual(["a", "b"]);
    expect("a" in proxy).toBe(true);
    expect("c" in proxy).toBe(false);
  });
});
