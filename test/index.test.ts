import { expect, it, describe } from "vitest";
import { format } from "prettier";
import { parseCode, generateCode } from "../src";

function generate(mod: any) {
  return format(generateCode(mod).code, { parser: "babel-ts" }).trim();
}

describe("paneer", () => {
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

  it("parse, update, generate", () => {
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

  describe.skip("createNode", () => {
    // it('literal', () => {
    //   expect(generateCode(createNode(123)).code)
    //     .toMatchInlineSnapshot('"123"')
    //   expect(generateCode(createNode(true)).code)
    //     .toMatchInlineSnapshot('"true"')
    //   // eslint-disable-next-line unicorn/no-null
    //   expect(generateCode(createNode(null)).code)
    //     .toMatchInlineSnapshot('"null"')
    // })

    it("object", () => {
      console.log(createNode({ foo: "bar" }));
      // expect(generateCode(createNode({ foo: 'bar' })).code)
      //   .toMatchInlineSnapshot(`
      //     "{
      //         \\"foo\\":\\"bar\\"
      //     }"
      //   `)
    });
  });
});
