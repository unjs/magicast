import { expect, it, describe } from "vitest";
import { MagicastError, parseModule } from "magicast";
import { generate } from "./_utils";

describe("exports", () => {
  it("manipulate exports", async () => {
    const mod = parseModule("");

    expect(Object.keys(mod.exports)).toEqual([]);
    expect(mod.exports).toMatchInlineSnapshot(`{}`);
    expect(await generate(mod)).toMatchInlineSnapshot('""');

    mod.exports.default = { foo: "1" };

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: "1",
      };"
    `);

    mod.exports.default.foo = 2;

    expect(await generate(mod)).toMatchInlineSnapshot(`
    "export default {
      foo: 2,
    };"
  `);

    mod.exports.named ||= [];
    mod.exports.named.push("a");

    expect(Object.keys(mod.exports)).toEqual(["default", "named"]);

    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: 2,
      };

      export const named = ["a"];"
    `);

    expect(Object.keys(mod)).toEqual(["imports", "exports", "generate"]);
    expect(JSON.stringify(mod, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "imports": {},
        "exports": {
          "default": {
            "foo": 2
          },
          "named": [
            "a"
          ]
        }
      }"
    `);

    // delete
    delete mod.exports.default;

    expect(await generate(mod)).toMatchInlineSnapshot(
      `"export const named = ["a"];"`,
    );

    delete mod.exports.named;

    expect(Object.keys(mod.exports)).toEqual([]);

    expect(await generate(mod)).toMatchInlineSnapshot('""');
  });
  it('export function', async () => {
    let mod = parseModule(`export function greet(name: string) { return "Hello " + name; }`);

    expect(typeof mod.exports.greet).toBe("function");
    expect(() => mod.exports.greet("World")).toThrow(MagicastError);

    // add async test
    mod = parseModule(`export async function fetchData() { return Promise.resolve(42); }`);

    expect(typeof mod.exports.fetchData).toBe("function");
    expect(() => mod.exports.fetchData()).toThrow(MagicastError);
  })
});
