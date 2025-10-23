import { expect, describe, it } from "vitest";
import { parseExpression, parseModule } from "magicast";
import { generate } from "./_utils";

describe("errors", () => {
  it("ternary", () => {
    const mod = parseModule(
      `
export default {
  a: 1 + 1 === 2
    ? 1
    : 2
}
    `.trim(),
    );

    expect(() => mod.exports.default.a).toThrowErrorMatchingInlineSnapshot(
      `
      [MagicastError: Casting "ConditionalExpression" is not supported

        1 | export default {
        2 |   a: 1 + 1 === 2
                 ^
        3 |     ? 1
        4 |     : 2
        5 | }
      ]
    `,
    );
  });

  it("expression", async () => {
    const mod = parseModule(
      `
export default {
  a: 1 + 1
}
    `.trim(),
    );

    expect(await generate(mod.exports.default)).toMatchInlineSnapshot(`
      "{
        a: 1 + 1;
      }"
    `);
    expect(await generate(mod.exports.default.a)).toMatchInlineSnapshot(
      `"1 + 1;"`,
    );
  });

  it("array destructuring", async () => {
    const mod = parseModule(
      `
export default {
  foo: [
    1,
    2,
    ...foo
  ]
}
    `.trim(),
    );

    // Adding an item should work
    mod.exports.default.foo.push("foo");
    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: [1, 2, ...foo, "foo"],
      };"
    `);

    // Iterating should throw
    expect(() => [
      ...mod.exports.default.foo,
    ]).toThrowErrorMatchingInlineSnapshot(
      `
      [MagicastError: Casting "SpreadElement" is not supported

        3 |     1,
        4 |     2,
        5 |     ...foo
                ^
        6 |   ]
        7 | }
      ]
    `,
    );
  });

  it("parseExpression", () => {
    // \u0020 is used to prevent IDEs from removing the trailing space

    expect(() => parseExpression<any>("foo ? {} : []"))
      .toThrowErrorMatchingInlineSnapshot(`
        [MagicastError: Casting "ConditionalExpression" is not supported

          1 |  foo ? {} : []\u0020
               ^
        ]
      `);

    const exp = parseExpression<any>("{ a: foo ? {} : [] }");
    expect(() => exp.a).toThrowErrorMatchingInlineSnapshot(`
      [MagicastError: Casting "ConditionalExpression" is not supported

        1 |  { a: foo ? {} : [] }\u0020
                  ^
      ]
    `);
  });
});
