import { describe, expect, it } from "vitest";
import { parseModule } from "../../src";
import { deepMergeObject } from "../../src/helpers/deep-merge";

describe("deepMergeObject", () => {
  it("should not cause infinite recursion when merging objects with shared references", () => {
    const mod = parseModule(`export default { config: { nested: {} } }`);
    const proxifiedObject = mod.exports.default;
    const sourceObject = {
      config: proxifiedObject.config,
    };

    expect(() => deepMergeObject(proxifiedObject, sourceObject)).not.toThrow();
    expect(Object.keys(proxifiedObject.config)).toEqual(["nested"]);
  });

  it("should correctly merge null and undefined values", () => {
    const mod = parseModule(`export default { a: 1, b: { c: 2 } }`);
    const proxifiedObject = mod.exports.default;

    const sourceWithNull = { a: null, d: null };
    deepMergeObject(proxifiedObject, sourceWithNull);
    expect(proxifiedObject.a).toBeNull();
    expect(proxifiedObject.d).toBeNull();

    const sourceWithUndefined = { b: undefined };
    deepMergeObject(proxifiedObject, sourceWithUndefined);
    expect(proxifiedObject.b).toBeUndefined();
  });
});
