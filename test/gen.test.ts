/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import {
  CodegenOptions,
  DynamicImportOptions,
  ImportOrExportOptions,
  Name,
  genImport,
  genExport,
  genArrayFromRaw,
  genDynamicImport,
  genObjectFromRaw,
  genObjectFromRawEntries,
  genRawValue,
  genString,
  wrapInDelimiters
} from '../src/gen'

const genImportTests: Array<{ specifier?: string, opts?: ImportOrExportOptions, names: Name | Name[], code?: string, error?: boolean }> = [
  { names: 'foo', code: 'import foo from "pkg";' },
  { names: 'default', code: 'cannot import default', error: true },
  { names: 'foo', specifier: 'C:\\Test\\file.js', code: 'import foo from "C:/Test/file.js";', opts: { normalizePaths: true } },
  { names: ['foo'], code: 'import { foo } from "pkg";' },
  { names: [{ name: 'foo', as: 'bar' }], code: 'import { foo as bar } from "pkg";' },
  { names: [{ name: 'foo', as: 'foo' }], code: 'import { foo } from "pkg";' },
  { names: { name: '*', as: 'bar' }, code: 'import * as bar from "pkg";' },
  { names: [{ name: 'default', as: 'Test' }], code: 'import { default as Test } from "pkg";' },
  { names: 'foo', code: 'import foo from "pkg"', opts: { semi: false } }
]

describe('genImport', () => {
  it('imports with side effects', () => {
    expect(genImport('pkg')).to.equal('import "pkg";')
  })
  for (const t of genImportTests) {
    it(t.code, () => {
      try {
        const code = genImport(t.specifier || 'pkg', t.names || 'default', t.opts)
        expect(code).to.equal(t.code)
      } catch (e) {
        if (!t.error) { console.error(e) }
        expect(t.error).to.be.true
      }
    })
  }
})

const genExportTests: Array<{ specifier?: string, opts?: ImportOrExportOptions, names: Name | Name[], code?: string, error?: boolean }> = [
  { names: ['foo'], code: 'export { foo } from "pkg";' },
  { names: 'foo', code: 'cannot export unnamed default', error: true },
  { names: ['foo'], specifier: 'C:\\Test\\file.js', code: 'export { foo } from "C:/Test/file.js";', opts: { normalizePaths: true } },
  { names: [{ name: 'foo', as: 'bar' }], code: 'export { foo as bar } from "pkg";' },
  { names: { name: '*', as: 'bar' }, code: 'export * as bar from "pkg";' },
  { names: ['default'], code: 'export { default } from "pkg";' },
  { names: ['foo'], code: 'export { foo } from "pkg"', opts: { semi: false } }
]

describe('genExport', () => {
  for (const t of genExportTests) {
    it(t.code, () => {
      try {
        const code = genExport(t.specifier || 'pkg', t.names || 'default', t.opts)
        expect(code).to.equal(t.code)
      } catch (e) {
        if (!t.error) { console.error(e) }
        expect(t.error).to.be.true
      }
    })
  }
})

const genDynamicImportTests: Array<{ specifier?: string, opts?: DynamicImportOptions, code?: string, error?: boolean }> = [
  { code: '() => import("pkg")' },
  { opts: { wrapper: false }, code: 'import("pkg")' },
  {
    opts: { interopDefault: true },
    code: '() => import("pkg").then(m => m.default || m)'
  },
  {
    opts: { comment: 'webpackChunkName: "chunks/dynamic"' },
    code: '() => import("pkg" /* webpackChunkName: "chunks/dynamic" */)'
  }
]

describe('genDynamicImport', () => {
  for (const t of genDynamicImportTests) {
    it(t.code, () => {
      const code = genDynamicImport(t.specifier || 'pkg', t.opts)
      expect(code).to.equal(t.code)
    })
  }
})

const genObjectFromRawTests: Array<{ obj?: any, opts?: CodegenOptions, code?: string, error?: boolean }> = [
  {
    obj: {
      a: 'null',
      b: null,
      c: undefined,
      1: 'undefined',
      2: true,
      3: 'true',
      'obj 1': '{ literal: () => "test" }',
      'obj 2': { nested: { foo: '"bar"' } },
      arr: ['1', '2', '3']
    },
    code: [
      '{',
      '  1: undefined,',
      '  2: true,',
      '  3: true,',
      '  a: null,',
      '  b: null,',
      '  c: undefined,',
      '  "obj 1": { literal: () => "test" },',
      '  "obj 2": {',
      '    nested: {',
      '      foo: "bar"',
      '    }',
      '  },',
      '  arr: [',
      '    1,',
      '    2,',
      '    3',
      '  ]',
      '}'
    ].join('\n')
  },
  {
    obj: {
      'obj 1': '{ literal: () => "test" }',
      'obj 2': {}
    },
    opts: {
      singleQuotes: true
    },
    code: [
      '{',
      "  'obj 1': { literal: () => \"test\" },",
      "  'obj 2': {}",
      '}'
    ].join('\n')
  }
]

describe('genObjectFromRaw', () => {
  for (const t of genObjectFromRawTests) {
    it(t.code, () => {
      const code = genObjectFromRaw(t.obj, t.opts)
      expect(code).to.equal(t.code)
    })
  }
})

describe('genObjectFromRawEntries', () => {
  for (const t of genObjectFromRawTests) {
    it(t.code, () => {
      const code = genObjectFromRawEntries(Object.entries(t.obj), t.opts)
      expect(code).to.equal(t.code)
    })
  }
})

const genArrayFromRawTests = [
  {
    code: `
[
  1,
  2,
  true,
  null
]`.trim(),
    arr: [1, '2', true, null]
  }
]

describe('genArrayFromRaw', () => {
  for (const t of genArrayFromRawTests) {
    it(t.code, () => {
      const code = genArrayFromRaw(t.arr)
      expect(code).to.equal(t.code)
    })
  }
})

describe('genString', () => {
  it('escapes double-quoted string', () => {
    expect(genString('test')).to.equal('"test"')
    expect(genString('test\'s my "quote"')).to.equal('"test\'s my \\"quote\\""')
  })
  it('escapes single-quote version', () => {
    expect(genString('test', { singleQuotes: true })).to.equal("'test'")
    expect(genString('test\'s my "quote"', { singleQuotes: true })).to.equal("'test\\'s my \"quote\"'")
  })
})

const rawValues = [
  ['null', 'null'],
  [undefined, 'undefined'],
  [null, 'null'],
  [true, 'true'],
  [1, '1'],
  [1e3, '1000'],
  [1_000_000, '1000000'],
  [9007199254740992n, '9007199254740992'],
  // arrays
  [['1'], '[\n  1\n]'],
  [[1], '[\n  1\n]'],
  // objects
  [{ 1: 'test' }, '{\n  1: test\n}']
]
describe('genRawValue', () => {
  for (const [input, output] of rawValues) {
    it(`${input}`, () => {
      const code = genRawValue(input)
      expect(code).to.equal(output)
    })
  }
})

describe('wrapInDelimiters', () => {
  it('handles empty lines', () => {
    expect(wrapInDelimiters([])).to.equal('{}')
  })
  it('uses alternative delimiters', () => {
    expect(wrapInDelimiters([], { delimiters: '[]' })).to.equal('[]')
  })
})
