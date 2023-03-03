import { expect, it, describe } from "vitest";
import { parseModule } from "../src";
import { generate } from "./_utils";

describe("exports", () => {
  it("manipulate exports", () => {
    const mod = parseModule("");

    expect(mod.exports).toMatchInlineSnapshot(`{}`);
    expect(generate(mod)).toMatchInlineSnapshot('""');

    mod.exports.default = { foo: "1" };

    expect(generate(mod)).toMatchInlineSnapshot(`
    "export default {
      foo: \\"1\\",
    };"
  `);

    mod.exports.default.foo = 2;

    expect(generate(mod)).toMatchInlineSnapshot(`
    "export default {
      foo: 2,
    };"
  `);

    mod.exports.named ||= [];
    mod.exports.named.push("a");

    expect(generate(mod)).toMatchInlineSnapshot(`
    "export default {
      foo: 2,
    };

    export const named = [\\"a\\"];"
  `);

    // delete
    delete mod.exports.default;

    expect(generate(mod)).toMatchInlineSnapshot(
      '"export const named = [\\"a\\"];"'
    );

    delete mod.exports.named;

    expect(generate(mod)).toMatchInlineSnapshot('""');
  });
});
