import { describe, expect, it } from "vitest";
import { parseModule } from "magicast";
import { generate } from "./_utils";

describe("array", () => {
  it("array operations", async () => {
    const mod = parseModule<{ default: (number | any | string)[] }>(
      `export default [1, 2, 3, 4, 5]`,
    );

    expect(Array.isArray(mod.exports.default)).toBe(true);
    expect(mod.exports.default.length).toBe(5);
    expect(mod.exports.default.includes(5)).toBe(true);
    expect(mod.exports.default.includes(6)).toBe(false);

    const deleted = mod.exports.default.splice(1, 3, { foo: "bar" }, "bar");

    expect(deleted).toEqual([2, 3, 4]);

    expect(await generate(mod)).toMatchInlineSnapshot(
      `
      "export default [
        1,
        {
          foo: "bar",
        },
        "bar",
        5,
      ];"
    `,
    );

    const foundIndex = mod.exports.default.findIndex(
      (item) => item.foo === "bar",
    );
    const found = mod.exports.default.find((item) => item.foo === "bar");

    expect(foundIndex).toBe(1);
    expect(found).toMatchInlineSnapshot(`
      {
        "foo": "bar",
      }
    `);
  });

  it("array should be iterable", () => {
    const mod = parseModule(`
      export const config = {
        array: ['a']
      }
    `);
    expect(Array.isArray(mod.exports.config.array)).toBe(true);
    const arr = [...mod.exports.config.array];
    expect(arr).toMatchInlineSnapshot(`
      [
        "a",
      ]
    `);
  });

  it("array iterator methods", () => {
    const mod = parseModule<{ default: { id: number }[] }>(
      `export default [{ id: 1 }, { id: 2 }, { id: 3 }]`,
    );

    const arr = mod.exports.default;
    expect(Array.isArray(arr)).toBe(true);

    // .map()
    const ids = arr.map((item) => item.id);
    expect(ids).toEqual([1, 2, 3]);

    // .filter()
    const filtered = arr.filter((item) => item.id > 1);
    expect(filtered.map((item) => item.id)).toEqual([2, 3]);
    expect(filtered.length).toBe(2);

    // .reduce()
    const sum = arr.reduce((acc, item) => acc + item.id, 0);
    expect(sum).toBe(6);

    // .forEach()
    let count = 0;
    // eslint-disable-next-line unicorn/no-array-for-each
    arr.forEach(() => count++);
    expect(count).toBe(3);

    // Destructuring (tests Symbol.iterator)
    const [first] = arr;
    expect(first.id).toBe(1);

    // Spread syntax (tests Symbol.iterator)
    const fullArray = [...arr];
    expect(fullArray.length).toBe(3);
    expect(fullArray[2].id).toBe(3);
  });
});
