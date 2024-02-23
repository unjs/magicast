import { describe, expect, it } from "vitest";
import { parseModule, generateCode } from "../src";

describe("should have $comment", () => {
  it("should have $comment proxy", async () => {
    const mod = await parseModule(`
        export default {
            a: 'A', // a commmnet
            b: 1, // b comment
            // c comment
            c: true,
            d: {
                e: 'E',
                // i comment
                i: 'I'
            }
        };
        `);

    // mod.exports.default.a.$comment = 'asdsad' // throw Error because mod.exports.default.a is proxied to a string

    expect(mod.exports.default.$comment.a).eq(" a commmnet");
    mod.exports.default.$comment.a = " THIS IS A ";

    // How to set comment of d ?
    mod.exports.default.$comment.d = "THIS IS D";

    mod.exports.default.$comment.d.$comment.e = "THIS IS E";
    expect(mod.exports.default.$comment.d.$comment.i).toBe(" i comment");

    mod.exports.$comment.default = "AAA";

    console.info(generateCode(mod).code);
  });
});