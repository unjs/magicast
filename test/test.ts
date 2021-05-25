import { parse, compile } from '../src'

const program = parse(`
export const a = {}
export default {
  // This is foo
  foo: ['a']
}`)

program.exports.default.props.foo.push('b')

console.log(compile(program).code)
