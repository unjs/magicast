# Changelog


## v0.3.4

[compare changes](https://github.com/unjs/magicast/compare/v0.3.3...v0.3.4)

### 🚀 Enhancements

- Support logical and member expression ([#111](https://github.com/unjs/magicast/pull/111))

### 🏡 Chore

- Update deps ([b37096a](https://github.com/unjs/magicast/commit/b37096a))

### ❤️ Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Lucie ([@lihbr](http://github.com/lihbr))

## v0.3.3

[compare changes](https://github.com/unjs/magicast/compare/v0.3.2...v0.3.3)

### 🚀 Enhancements

- Support `ArrowFunctionExpression` ([#98](https://github.com/unjs/magicast/pull/98))

### 🏡 Chore

- Update deps and test snaps ([122409f](https://github.com/unjs/magicast/commit/122409f))

### ❤️ Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Ari Perkkiö ([@AriPerkkio](http://github.com/AriPerkkio))

## v0.3.2

[compare changes](https://github.com/unjs/magicast/compare/v0.3.1...v0.3.2)

### 🩹 Fixes

- Quoted properties of `ObjectExpression` not in exports proxy ([#94](https://github.com/unjs/magicast/pull/94))

### 🏡 Chore

- Rebuild lock ([32efceb](https://github.com/unjs/magicast/commit/32efceb))

### ❤️ Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Ari Perkkiö ([@AriPerkkio](http://github.com/AriPerkkio))

## v0.3.1

[compare changes](https://github.com/unjs/magicast/compare/v0.3.0...v0.3.1)

### 🩹 Fixes

- Unable to get value using `NumericLiteral` or `BooleanLiteral` type keys ([#91](https://github.com/unjs/magicast/pull/91))

### 🏡 Chore

- Update deps ([71bd811](https://github.com/unjs/magicast/commit/71bd811))

### ❤️ Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Pink Champagne

## v0.3.0

[compare changes](https://github.com/unjs/magicast/compare/v0.2.11...v0.3.0)

### 🩹 Fixes

- ⚠️  `writeFile` now requires filename ([#79](https://github.com/unjs/magicast/pull/79))

### 📦 Build

- Bundle recast ([#81](https://github.com/unjs/magicast/pull/81))

### 🏡 Chore

- **release:** V0.2.11 ([0d65b23](https://github.com/unjs/magicast/commit/0d65b23))

#### ⚠️ Breaking Changes

- ⚠️  `writeFile` now requires filename ([#79](https://github.com/unjs/magicast/pull/79))

### ❤️ Contributors

- Estéban ([@Barbapapazes](http://github.com/Barbapapazes))
- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.11

[compare changes](https://github.com/unjs/magicast/compare/v0.2.10...v0.2.11)

### 🚀 Enhancements

- **helpers:** Handle Vite config declarations with `satisfies` keyword ([#82](https://github.com/unjs/magicast/pull/82))

### 🏡 Chore

- **release:** V0.2.10 ([4faf487](https://github.com/unjs/magicast/commit/4faf487))
- Use v8 coverage ([c1277a7](https://github.com/unjs/magicast/commit/c1277a7))
- Update deps, lint with new prettier ([30df539](https://github.com/unjs/magicast/commit/30df539))
- Update tsconfig ([02743d3](https://github.com/unjs/magicast/commit/02743d3))
- Lint ([4601589](https://github.com/unjs/magicast/commit/4601589))

### 🤖 CI

- Update lint order ([5a5d49d](https://github.com/unjs/magicast/commit/5a5d49d))

### ❤️ Contributors

- Lukas Stracke <lukas.stracke@sentry.io>
- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.10

[compare changes](https://github.com/unjs/magicast/compare/v0.2.9...v0.2.10)

### 🚀 Enhancements

- **helpers:** Handle Vite config objects declared as variables in `addVitePlugin` ([#69](https://github.com/unjs/magicast/pull/69))

### 🩹 Fixes

- **object:** Handle nested keys kebab-case style ([#71](https://github.com/unjs/magicast/pull/71))

### 🏡 Chore

- Update deps ([15d091e](https://github.com/unjs/magicast/commit/15d091e))
- **release:** V0.2.9 ([d9ef2eb](https://github.com/unjs/magicast/commit/d9ef2eb))
- Update deps ([fd297f0](https://github.com/unjs/magicast/commit/fd297f0))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Lukas Stracke <lukas.stracke@sentry.io>
- Baptiste Leproux <leproux.baptiste@gmail.com>

## v0.2.9

[compare changes](https://github.com/unjs/magicast/compare/v0.2.8...v0.2.9)


### 🚀 Enhancements

  - DeepMergeObject improvements; NumericLiteral and StringLiteral keys ([#63](https://github.com/unjs/magicast/pull/63))

### 🏡 Chore

  - Update deps ([15d091e](https://github.com/unjs/magicast/commit/15d091e))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Yaël Guilloux ([@Tahul](http://github.com/Tahul))

## v0.2.8

[compare changes](https://github.com/unjs/magicast/compare/v0.2.7...v0.2.8)


### 🩹 Fixes

  - Type resolution in node16 environments ([#60](https://github.com/unjs/magicast/pull/60))
  - **helpers:** Improve deepMergeObject handling case ([#62](https://github.com/unjs/magicast/pull/62))

### 🏡 Chore

  - **release:** V0.2.7 ([c719013](https://github.com/unjs/magicast/commit/c719013))
  - Typo ([#59](https://github.com/unjs/magicast/pull/59))

### ❤️  Contributors

- Yaël Guilloux ([@Tahul](http://github.com/Tahul))
- Samuel Stroschein 
- Igor Babko ([@igorbabko](http://github.com/igorbabko))
- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.7

[compare changes](https://github.com/unjs/magicast/compare/v0.2.6...v0.2.7)


### 🩹 Fixes

  - **createProxy:** Trap for the 'in' operator ([#58](https://github.com/unjs/magicast/pull/58))

### ❤️  Contributors

- Zoeyzhao19

## v0.2.6

[compare changes](https://github.com/unjs/magicast/compare/v0.2.5...v0.2.6)


### 🩹 Fixes

  - Proxy sub module types ([3251584](https://github.com/unjs/magicast/commit/3251584))

### 🏡 Chore

  - Lint ([b32604b](https://github.com/unjs/magicast/commit/b32604b))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.5

[compare changes](https://github.com/unjs/magicast/compare/v0.2.4...v0.2.5)


### 🚀 Enhancements

  - Add Vite plugin at a given index ([#53](https://github.com/unjs/magicast/pull/53))

### 🩹 Fixes

  - Support code with `as` and `satisfies` ([#55](https://github.com/unjs/magicast/pull/55))

### 🏡 Chore

  - Update release script ([602c25d](https://github.com/unjs/magicast/commit/602c25d))
  - Import type ([#50](https://github.com/unjs/magicast/pull/50))
  - Update format ([48be33a](https://github.com/unjs/magicast/commit/48be33a))
  - Update script ([e21055b](https://github.com/unjs/magicast/commit/e21055b))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Lukas Stracke <lukas.stracke@sentry.io>
- LiuSeen 
- Mateusz Burzyński ([@Andarist](http://github.com/Andarist))

## v0.2.4

[compare changes](https://github.com/unjs/magicast/compare/v0.2.3...v0.2.4)


### 🩹 Fixes

  - Enumerable keys for `exports` and `imports`, close #38 ([#38](https://github.com/unjs/magicast/issues/38))
  - Make proxied module enumerable, close #47 ([#47](https://github.com/unjs/magicast/issues/47))

### 📖 Documentation

  - Add notes about usage ([5c5cd52](https://github.com/unjs/magicast/commit/5c5cd52))

### 🏡 Chore

  - **release:** V0.2.3 ([f8dc796](https://github.com/unjs/magicast/commit/f8dc796))
  - Update deps ([3de0c61](https://github.com/unjs/magicast/commit/3de0c61))
  - Update deps ([cf0e6cb](https://github.com/unjs/magicast/commit/cf0e6cb))
  - Add lint-staged ([7fa88fc](https://github.com/unjs/magicast/commit/7fa88fc))

### ✅ Tests

  - Add identifier as property example ([fb77b5d](https://github.com/unjs/magicast/commit/fb77b5d))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.3

[compare changes](https://github.com/unjs/magicast/compare/v0.2.2...v0.2.3)


### 🩹 Fixes

  - Enumerable keys for `exports` and `imports`, close #38 ([#38](https://github.com/unjs/magicast/issues/38))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>

## v0.2.2

[compare changes](https://github.com/unjs/magicast/compare/v0.2.1...v0.2.2)


### 🚀 Enhancements

  - Add identifier casting ([#39](https://github.com/unjs/magicast/pull/39))

### ❤️  Contributors

- Hugo ATTAL <hugoattal@hotmail.fr>

## v0.2.1

[compare changes](https://github.com/unjs/magicast/compare/v0.2.0...v0.2.1)


### 🚀 Enhancements

  - Support `builder.raw` ([4983f47](https://github.com/unjs/magicast/commit/4983f47))
  - Support `builder.newExpression` ([cf5ad6d](https://github.com/unjs/magicast/commit/cf5ad6d))

### 📖 Documentation

  - Add some examples ([3106c32](https://github.com/unjs/magicast/commit/3106c32))
  - Typo ([#32](https://github.com/unjs/magicast/pull/32))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Betteroneday

## v0.2.0

[compare changes](https://github.com/unjs/magicast/compare/v0.1.1...v0.2.0)


### 🚀 Enhancements

  - Support delete operation ([ad40a7b](https://github.com/unjs/magicast/commit/ad40a7b))
  - Support more array operation ([90040ee](https://github.com/unjs/magicast/commit/90040ee))
  - Use proxy for top level module ([#8](https://github.com/unjs/magicast/pull/8))
  - `imports` support ([#11](https://github.com/unjs/magicast/pull/11))
  - Support Date, Set, and Map to `literalToAst` ([b97d8f2](https://github.com/unjs/magicast/commit/b97d8f2))
  - Automatically preserve code style ([#10](https://github.com/unjs/magicast/pull/10))
  - Improve error system ([4a286e2](https://github.com/unjs/magicast/commit/4a286e2))
  - Construct function call ([#15](https://github.com/unjs/magicast/pull/15))
  - Improve typescript support ([9d9bd43](https://github.com/unjs/magicast/commit/9d9bd43))
  - Support `mod.generate` ([b27e2b5](https://github.com/unjs/magicast/commit/b27e2b5))
  - ⚠️  `parseModule` and `parseExpression` ([#24](https://github.com/unjs/magicast/pull/24))
  - Add high level helpers ([912c135](https://github.com/unjs/magicast/commit/912c135))

### 🔥 Performance

  - Cache proxify ([949ec48](https://github.com/unjs/magicast/commit/949ec48))

### 🩹 Fixes

  - Improve edge cases of `literalToAst` ([f9b6296](https://github.com/unjs/magicast/commit/f9b6296))

### 💅 Refactors

  - ⚠️  Rename `.arguments` to `.$args` for functions ([#7](https://github.com/unjs/magicast/pull/7))
  - Use `@babel/types` over `estree` ([308fd21](https://github.com/unjs/magicast/commit/308fd21))
  - Split test files ([dcc759e](https://github.com/unjs/magicast/commit/dcc759e))
  - Break down test files ([5af3f8c](https://github.com/unjs/magicast/commit/5af3f8c))
  - Break down files ([fecdee1](https://github.com/unjs/magicast/commit/fecdee1))
  - ⚠️  Rename `builder` to `builders` ([0dd8e9a](https://github.com/unjs/magicast/commit/0dd8e9a))

### 📖 Documentation

  - Update usage ([51a82eb](https://github.com/unjs/magicast/commit/51a82eb))
  - Update ([#19](https://github.com/unjs/magicast/pull/19))
  - Update badges ([#26](https://github.com/unjs/magicast/pull/26))

### 🏡 Chore

  - Fix type errors ([effae7c](https://github.com/unjs/magicast/commit/effae7c))
  - Lint ([c58699b](https://github.com/unjs/magicast/commit/c58699b))
  - Fix typo ([fa3ce99](https://github.com/unjs/magicast/commit/fa3ce99))
  - **readme:** Fix space ([#23](https://github.com/unjs/magicast/pull/23))
  - Update deps ([8185270](https://github.com/unjs/magicast/commit/8185270))
  - Fix build ([89772a5](https://github.com/unjs/magicast/commit/89772a5))

#### ⚠️  Breaking Changes

  - ⚠️  `parseModule` and `parseExpression` ([#24](https://github.com/unjs/magicast/pull/24))
  - ⚠️  Rename `.arguments` to `.$args` for functions ([#7](https://github.com/unjs/magicast/pull/7))
  - ⚠️  Rename `builder` to `builders` ([0dd8e9a](https://github.com/unjs/magicast/commit/0dd8e9a))

### ❤️  Contributors

- Anthony Fu <anthonyfu117@hotmail.com>
- Sébastien Chopin <seb@nuxtlabs.com>
- Alexander Lichter ([@manniL](http://github.com/manniL))
- Pooya Parsa ([@pi0](http://github.com/pi0))

