import { parse, proxifyAST, generate } from '../src'

const ast = proxifyAST(parse(`
export const a = {}
export default {
  // This is foo
  foo: ['a']
}`))

ast.exports.default.props.foo.push('b')

// eslint-disable-next-line no-console
console.log(generate(ast).code)
