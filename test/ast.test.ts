import { expect } from 'chai'
import { parse, proxifyAST, generate } from '../src'

describe('proxyAST', () => {
  it('should produce correct code', () => {
    const ast = proxifyAST(
      parse(`
      export const a = {}
      export default {
        // This is foo
        foo: ['a']
      }`)
    )

    ast.exports.default.props.foo.push('b')

    expect(generate(ast).code).to.equal(
        `
      export const a = {}
      export default {
        // This is foo
        foo: ['a', "b"]
      }`
    )
  })
})
