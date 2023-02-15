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

    mod1.exports.default.b = mod2.exports.default

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
  })

  it.skip("parse, update, generate", () => {
    const _module = parseCode(`
      export const a: any = {}
      export default defineConfig({
        // Modules
        modules: ["a"]
      })
    `);

    const arg = _module.exports.default.arguments[0];
    arg.props.modules.push("b");

    const { code } = generateCode(_module);

    expect(code).toMatchInlineSnapshot(`
      "
            export const a: any = {}
            export default defineConfig({
              // Modules
              modules: [\\"a\\", \\"b\\"]
            })
          "
    `);
  });

  describe('createNode', () => {
    it('literal', () => {
      expect(generateCode(createNode(123)).code)
        .toMatchInlineSnapshot('"123"')
      expect(generateCode(createNode(true)).code)
        .toMatchInlineSnapshot('"true"')
      expect(generateCode(createNode(null)).code)
        .toMatchInlineSnapshot('"null"')
    })

    it('object', () => {
      expect(generateCode(createNode({ foo: 'bar' })).code)
        .toMatchInlineSnapshot(`
          "{
              \\"foo\\":\\"bar\\"
          }"
        `)
    })
  });
})
