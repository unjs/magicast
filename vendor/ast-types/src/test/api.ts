import assert from "assert";
import { namedTypes, builders } from "../main";
import * as types from "../main";

describe("namedTypes", function () {
  it("should work as a namespace", function () {
    const id = builders.identifier("oyez");
    namedTypes.Identifier.assert(id);
  });

  it("should work as a type", function () {
    function getIdName(id: namedTypes.Identifier) {
      return id.name;
    }
    assert.strictEqual(
      getIdName(builders.identifier("oyez")),
      "oyez",
    );
  });

  it("should work as a value", function () {
    assert.strictEqual(typeof namedTypes, "object");
    assert.strictEqual(typeof namedTypes.IfStatement, "object");
  });
});

describe("types.namedTypes", function () {
  it("should work as a namespace", function () {
    const id = types.builders.identifier("oyez");
    types.namedTypes.Identifier.assert(id);
  });

  it("should work as a type", function () {
    function getIdName(id: types.namedTypes.Identifier) {
      return id.name;
    }
    assert.strictEqual(
      getIdName(types.builders.identifier("oyez")),
      "oyez",
    );
  });

  it("should work as a value", function () {
    assert.strictEqual(typeof types.namedTypes, "object");
    assert.strictEqual(typeof types.namedTypes.IfStatement, "object");
  });
});
