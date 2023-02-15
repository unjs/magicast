# 🧀 Magicast

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

Magicast allows you to programmatically modify JavaScript and Typescript source codes with a simplified, elegant and familiar syntax built on top of the [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) parsed by [recast](https://github.com/benjamn/recast) and [babel](https://babeljs.io/).

**Roadmap:**

🚧 Magicast is currently in the proof of concept state. While underlying parsers are stable, you might need to directly modify underlying AST for unsupported operations in the meantime.

## Usage

Install npm package:

```sh
# using yarn
yarn add --dev magicast

# using npm
npm install -D magicast

# using pnpm
pnpm add -D magicast
```

Import utilities:

```js
// ESM / Bundler
import { parseCode, generateCode, builders, createNode } from "magicast";

// CommonJS
const { parseCode, generateCode, builders, createNode } = require("panner");
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
import { loadFile, writeFile } from "magicast";

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
import { parseCode, generateCode } from "magicast";

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

[npm-version-src]: https://img.shields.io/npm/v/magicast?style=flat-square
[npm-version-href]: https://npmjs.com/package/magicast
[npm-downloads-src]: https://img.shields.io/npm/dm/magicast?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/magicast
[github-actions-src]: https://img.shields.io/github/workflow/status/unjs/magicast/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjs/magicast/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/magicast/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/magicast
