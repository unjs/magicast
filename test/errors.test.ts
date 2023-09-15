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
      "Casting \\"ConditionalExpression\\" is not supported

        1 | export default {
        2 |   a: 1 + 1 === 2
                 ^
        3 |     ? 1
        4 |     : 2
        5 | }
      "
    `,
    );
  });

  it("expression", () => {
    const mod = parseModule(
      `
export default {
  a: 1 + 1
}
    `.trim(),
    );

    expect(() => mod.exports.default.a).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"BinaryExpression\\" is not supported

        1 | export default {
        2 |   a: 1 + 1
                 ^
        3 | }
      "
    `,
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
        foo: [1, 2, ...foo, \\"foo\\"],
      };"
    `);

    // Iterating should throw
    expect(() => [
      ...mod.exports.default.foo,
    ]).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"SpreadElement\\" is not supported

        3 |     1,
        4 |     2,
        5 |     ...foo
                ^
        6 |   ]
        7 | }
      "
    `,
    );
  });

  it("object destructuring", async () => {
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

    // Adding a property should work
    mod.exports.default.foo.extra = "foo";
    expect(await generate(mod)).toMatchInlineSnapshot(`
      "export default {
        foo: {
          a: 1,
          ...bar,
          extra: \\"foo\\",
        },
      };"
    `);

    // Iterating should throw
    expect(() => ({
      ...mod.exports.default.foo,
    })).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"SpreadElement\\" is not supported

        2 |   foo: {
        3 |     a: 1,
        4 |     ...bar
                ^
        5 |   }
        6 | }
      "
    `,
    );
  });

  it("parseExpression", () => {
    // \u0020 is used to prevent IDEs from removing the trailing space

    expect(() => parseExpression<any>("foo ? {} : []"))
      .toThrowErrorMatchingInlineSnapshot(`
        "Casting \\"ConditionalExpression\\" is not supported

          1 |  foo ? {} : []\u0020
               ^
        "
      `);

    const exp = parseExpression<any>("{ a: foo ? {} : [] }");
    expect(() => exp.a).toThrowErrorMatchingInlineSnapshot(`
        "Casting \\"ConditionalExpression\\" is not supported

          1 |  { a: foo ? {} : [] }\u0020
                    ^
        "
      `);
  });
});
