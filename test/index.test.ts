import { expect, it, describe } from "vitest";
import { parseCode, generateCode, createNode } from "../src";

describe("paneer", () => {
  it("parse, update, generate", () => {
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
