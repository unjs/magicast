import { expect, describe, it } from "vitest";
import { parseCode } from "../src";
import { generate } from "./_utils";

describe("magicast", () => {
  it("ternary", () => {
    const mod = parseCode(
      `
export default {
  a: 1 + 1 === 2
    ? 1
    : 2
}
    `.trim()
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
    `
    );
  });

  it("expression", () => {
    const mod = parseCode(
      `
export default {
  a: 1 + 1
}
    `.trim()
    );

    expect(() => mod.exports.default.a).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"BinaryExpression\\" is not supported

        1 | export default {
        2 |   a: 1 + 1
                 ^
        3 | }
      "
    `
    );
  });

  // TODO: This could be supported
  it("identifier", () => {
    const mod = parseCode(
      `
const foo = {
  bar: 1
}

export default {
  a: foo
}
    `.trim()
    );

    expect(() => mod.exports.default.a).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"Identifier\\" is not supported

        4 | 
        5 | export default {
        6 |   a: foo
                 ^
        7 | }
      "
    `
    );
  });

  // TODO: This could be supported
  it("object shorthand", () => {
    const mod = parseCode(
      `
const foo = {
  bar: 1
}

export default {
  foo
}
    `.trim()
    );

    expect(() => mod.exports.default.foo).toThrowErrorMatchingInlineSnapshot(
      `
      "Casting \\"Identifier\\" is not supported

        4 | 
        5 | export default {
        6 |   foo
              ^
        7 | }
      "
    `
    );
  });

  it("array destructuring", () => {
    const mod = parseCode(
      `
export default {
  foo: [
    1,
    2,
    ...foo
  ]
}
    `.trim()
    );

    // Adding an item should work
    mod.exports.default.foo.push("foo");
    expect(generate(mod)).toMatchInlineSnapshot(`
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
    `
    );
  });

  it("object destructuring", () => {
    const mod = parseCode(
      `
export default {
  foo: {
    a: 1,
    ...bar
  }
}
    `.trim()
    );

    // Adding a property should work
    mod.exports.default.foo.extra = "foo";
    expect(generate(mod)).toMatchInlineSnapshot(`
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
    `
    );
  });
});
