# 🧀 Paneer

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

Paneer allows you to programmatically modify JavaScript and Typescript source codes with a simplified, elegant and familiar syntax built on top of the [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) parsed by [recast](https://github.com/benjamn/recast) and [babel](https://babeljs.io/).

**Roadmap:**

🚧 Paneer is currently in the proof of concept state. While underlying parsers are stable, you might need to directly modify underlying AST for unsupported operations in the meantime.

- Generic API
  - [x] Working parser and code generation with TS support
  - [ ] Access to comments
- ESM
  - [x] Basic syntax support
  - [x] Access to the named exports
  - [ ] Access to imports
- Typescript
  - [x] Basic syntax support
  - [ ] Allow access to type nodes with shortcuts
- Objects
  - [x] Iterate over properties
  - [ ] Assign new properties
- Arrays
  - [x] Push literal values
  - [ ] Iterate and modify elements individually
- Functions
  - [x] Access to call expression arguments
  - [ ] Access to function body
  - [ ] Access to function return

## Usage

Install npm package:

```sh
# using yarn
yarn add --dev paneer

# using npm
npm install -D paneer

# using pnpm
pnpm add -D paneer
```

Import utilities:

```js
// ESM / Bundler
import { parseCode, generateCode } from "paneer";
import * as p from "paneer";

// CommonJS
const { parseCode, generateCode } = require("panner");
const p = require("panner");
```

**Example:** Modify a file:

`config.js`:

```js
export default {
  foo: ["a"],
};
```

Code to modify and append `b` to `foo` prop of defaultExport:

```js
import { loadFile, writeFile } from "paneer";

const _module = await loadFile("config.js");

_module.exports.default.props.foo.push("b");

await writeFile(_module);
```

Updated `config.js`:

```js
export default {
  foo: ["a", "b"],
};
```

**Example:** Directly use AST utils:

```js
import { parseCode, generateCode } from "paneer";

// Parse to AST
const _module = parseCode(`export default { foo: ['a'] }`);

// Add a new array member
_module.exports.default.props.foo.push("b");

// Generate code
const { code, map } = generateCode(_module);
```

## Development

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with 💛

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/paneer?style=flat-square
[npm-version-href]: https://npmjs.com/package/paneer
[npm-downloads-src]: https://img.shields.io/npm/dm/paneer?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/paneer
[github-actions-src]: https://img.shields.io/github/workflow/status/unjs/paneer/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjs/paneer/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/paneer/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/paneer
