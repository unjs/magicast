import { describe, it, expect } from "vitest";
import { print } from "recast";
import { literalToAst } from "../src/proxy/_utils";

describe('literalToAst', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  function run(value: any) {
    return print(literalToAst(value)).code;
  }
  
  it('should work', () => {
    expect(run(1)).toMatchInlineSnapshot('"1"')
    expect(run(true)).toMatchInlineSnapshot('"true"')
    expect(run(undefined)).toMatchInlineSnapshot('"undefined"')
    // eslint-disable-next-line unicorn/no-null
    expect(run(null)).toMatchInlineSnapshot('"null"')
    expect(run([undefined, 1, { foo:'bar' }])).toMatchInlineSnapshot(`
      "[undefined, 1, {
          foo: \\"bar\\"
      }]"
    `)
  })
})
