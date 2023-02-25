import { describe, expect, it } from "vitest";
import { parseCode } from "../src";
import { generate } from "./_utils";

describe("function-calls", () => {
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
    expect(mod.exports.default.$callee).toBe("defineConfig");
    expect(mod.exports.default.$args).toMatchInlineSnapshot(`
        [
          {
            "modules": [
              "a",
            ],
          },
        ]
      `);

    const options = mod.exports.default.$args[0];

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
});
