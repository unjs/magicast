# 🧀 Paneer

Modify code like a cheese! Using [recast](https://github.com/benjamn/recast) for AST modifications.

## Usage

Install npm package:

```sh
# using yarn
yarn add --dev paneer

# using npm
npm install -D paneer
```

Import utilities:

```js
// ESM / Bundler
import { parse, compile } from 'paneer'
import * as p from 'paneer'

// CommonJS
const { parse, compile } = require('paneer')
const p = require('paneer')
```

**Example:** Modify a file:

`config.js`:

```js
export default {
  foo: ['a']
}
```

Code to modify and append `b` to `foo` prop of defaultExport:

```js
import { load, write } from 'paneer'

const ast = await load('config.js')

ast.exports.default.props.foo.push('b')

await write(ast)
```

Updated `config.js`:

```js
export default {
  foo: ['a', "b"]
}
```

**Example:** Directly use AST utils:

```js
import * as p from 'paneer'

// Parse to AST
const ast = p.parse(`export default { foo: ['a'] }`)

// Find default export
const defaultExport = p.defaultExport(ast)

// Get foo prop of object
const foo = p.get(p.defaultExport(ast), 'foo')

// Push 'b' literal to array
p.push(foo, 'b')

// Generate code
const { code, map } = p.generate(node)
```

## License

MIT
