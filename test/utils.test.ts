import { describe, it, expect } from "vitest";
import { print } from "recast";
import { literalToAst } from "../src/proxy/_utils";

describe("literalToAst", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  function run(value: any) {
    return print(literalToAst(value)).code;
  }

  it("basic", () => {
    expect(run(1)).toMatchInlineSnapshot('"1"');
    expect(run(true)).toMatchInlineSnapshot('"true"');
    expect(run(undefined)).toMatchInlineSnapshot('"undefined"');
    // eslint-disable-next-line unicorn/no-null
    expect(run(null)).toMatchInlineSnapshot('"null"');
    expect(run([undefined, 1, { foo: "bar" }])).toMatchInlineSnapshot(`
      "[undefined, 1, {
          foo: \\"bar\\"
      }]"
    `);
  });

  it("built-in objects", () => {
    expect(run(new Set(["foo", 1]))).toMatchInlineSnapshot(
      '"new Set([\\"foo\\", 1])"'
    );

    expect(run(new Date("2010-01-01"))).toMatchInlineSnapshot(
      '"new Date(\\"2010-01-01T00:00:00.000Z\\")"'
    );

    const map = new Map();
    map.set(1, "foo");
    map.set(2, "bar");
    expect(run(map)).toMatchInlineSnapshot(
      '"new Map([[1, \\"foo\\"], [2, \\"bar\\"]])"'
    );
  });

  it("circular reference", () => {
    const obj: any = {};
    obj.foo = obj;
    expect(() => run(obj)).toThrowError("Can not serialize circular reference");
  });
});
