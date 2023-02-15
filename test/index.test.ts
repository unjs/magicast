import { expect, it, describe } from "vitest";
import { format } from "prettier";
import { parseCode, generateCode } from "../src";

function generate(mod: any) {
  return format(generateCode(mod).code, { parser: "babel-ts" }).trim();
}

describe("magicast", () => {
  it("basic object and array", () => {
    const mod = parseCode(`export default { a: 1, b: { c: {} } }`);

    mod.exports.default.a = 2;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 2, b: { c: {} } };"'
    );

    mod.exports.default.b.c = { d: 3 };

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,
        b: {
          c: {
            d: 3,
          },
        },
      };"
    `);

    expect(mod.exports.default.b.c.d).toBe(3);

    mod.exports.default.modules ||= [];

    expect(mod.exports.default.modules.$ast).toBeDefined();

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,

        b: {
          c: {
            d: 3,
          },
        },

        modules: [],
      };"
    `);

    mod.exports.default.modules.push("a");
    mod.exports.default.modules.unshift({ foo: "bar" });

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        a: 2,

        b: {
          c: {
            d: 3,
          },
        },

        modules: [
          {
            foo: \\"bar\\",
          },
          \\"a\\",
        ],
      };"
    `);

    expect(mod.exports.default).toMatchInlineSnapshot(`
      {
        "a": 2,
        "b": {
          "c": {
            "d": 3,
          },
        },
        "modules": [
          {
            "foo": "bar",
          },
          "a",
        ],
      }
    `);

    expect(mod.exports.default.modules.$type).toBe("array");
    expect(mod.exports.default.modules[0].$type).toBe("object");
  });

  it("mix two configs", () => {
    const mod1 = parseCode(`export default { a: 1 }`);
    const mod2 = parseCode(`export default { b: 2 }`);

    mod1.exports.default.b = mod2.exports.default;

    expect(generate(mod1)).toMatchInlineSnapshot(
      `
      "export default {
        a: 1,

        b: {
          b: 2,
        },
      };"
    `
    );
  });

  it("function wrapper", () => {
    const mod = parseCode(`
      export const a: any = { foo: 1}
      export default defineConfig({
        // Modules
        modules: ["a"]
      })
    `);

    expect(mod.exports.a.foo).toBe(1);
    expect(mod.exports.default.$type).toBe("function-call");
    expect(mod.exports.default.arguments).toMatchInlineSnapshot(`
        [
          {
            "modules": [
              "a",
            ],
          },
        ]
      `);

    const options = mod.exports.default.arguments[0];

    options.modules ||= [];
    options.modules.push("b");

    expect(generate(mod)).toMatchInlineSnapshot(`
      "export const a: any = { foo: 1 };
      export default defineConfig({
        // Modules
        modules: [\\"a\\", \\"b\\"],
      });"
    `);
  });

  it("delete property", () => {
    const mod = parseCode(`export default { a: 1, b: [1, { foo: 'bar' }] }`);

    delete mod.exports.default.b[1].foo;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 1, b: [1, {}] };"'
    );

    delete mod.exports.default.b[0];
    expect(generate(mod)).toMatchInlineSnapshot(
      '"export default { a: 1, b: [undefined, {}] };"'
    );

    delete mod.exports.default.a;
    expect(generate(mod)).toMatchInlineSnapshot(`
      "export default {
        b: [undefined, {}],
      };"
    `);
  });

  it("array operations", () => {
    const mod = parseCode(`export default [1, 2, 3, 4, 5]`);

    expect(mod.exports.default.length).toBe(5);
    expect(mod.exports.default.includes(5)).toBe(true);
    expect(mod.exports.default.includes(6)).toBe(false);

    const deleted = mod.exports.default.splice(1, 3, { foo: 'bar' }, 'bar')
    
    expect(deleted).toEqual([2, 3, 4])

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

    const foundIndex = mod.exports.default.findIndex((item) => item.foo === 'bar')
    const found = mod.exports.default.find((item) => item.foo === 'bar')

    expect(foundIndex).toBe(1)
    expect(found).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `)
  })
});
