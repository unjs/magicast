# Changelog


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

