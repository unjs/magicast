import { expect, it, describe } from "vitest";
import { generateCode, parseModule, parseExpression } from "../src";
import { generate } from "./_utils";

describe("general", () => {
  it("basic object and array", () => {
    const mod = parseModule(`export default { a: 1, b: { c: {} } }`);

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
    const mod1 = parseModule(`export default { a: 1 }`);
    const mod2 = parseModule(`export default { b: 2 }`);

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

  it("delete property", () => {
    const mod = parseModule(`export default { a: 1, b: [1, { foo: 'bar' }] }`);

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

  it("should preserve code styles", () => {
    const mod = parseModule(`
      export const config = {
        array: ['a']
      }
    `);
    mod.exports.config.array.push("b");
    expect(generateCode(mod).code).toMatchInlineSnapshot(`
      "export const config = {
        array: ['a', 'b']
      }"
    `);
  });

  describe("parseExpression", () => {
    it("object", () => {
      const exp = parseExpression<any>("{ a: 1, b: 2 }");

      expect(exp).toEqual({ a: 1, b: 2 });

      exp.a = [1, 3, 4];

      expect(generateCode(exp).code).toMatchInlineSnapshot(`
        "{
          a: [1, 3, 4],
          b: 2
        }"
      `);
    });

    it("array", () => {
      const exp = parseExpression<any>("[1, { foo: 2 }]");

      expect(exp).toMatchInlineSnapshot(`
        [
          1,
          {
            "foo": 2,
          },
        ]
      `);

      exp[2] = "foo";

      expect(generateCode(exp).code).toMatchInlineSnapshot(
        '"[1, { foo: 2 }, \\"foo\\"]"'
      );
    });
  });
});
