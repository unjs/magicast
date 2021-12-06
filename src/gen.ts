import { isAbsolute, normalize } from 'pathe'

export interface CodegenOptions {
  /** whether to use single quotes - @default false */
  singleQuotes?: boolean
  /** whether to add semicolon after a full statement - @default true */
  semi?: boolean
  /** set to false to disable indentation, or the current indent level */
  indent?: false | string
  /** set to false to disable multi-line arrays/objects */
  lineBreaks?: boolean
}

// genImport and genExport
export type Name<T = string, As = string> = T | { name: T, as?: As }
export interface ImportOrExportOptions extends CodegenOptions {
  /** if set to true, normalize any absolute paths passed as specifiers - @default false */
  normalizePaths?: boolean
}

export function genImport (specifier: string, defaultImport?: Name, opts?: ImportOrExportOptions): string
export function genImport (specifier: string, imports?: Name[], opts?: ImportOrExportOptions): string
export function genImport (specifier: string, names?: Name | Name[], opts: ImportOrExportOptions = {}) {
  if (opts.normalizePaths && isAbsolute(specifier)) {
    specifier = normalize(specifier)
  }
  const specifierStr = genString(specifier, opts) + (opts.semi === false ? '' : ';')
  if (!names) {
    // import with side effects
    return `import ${specifierStr}`
  }

  const normalizedNames = normalizeNames(names)
  const shouldDestructure = Array.isArray(names)
  if (normalizedNames.some(i => i.as === 'default' || (!i.as && i.name === 'default'))) {
    throw new Error('Cannot import a module as `default`')
  }
  const namesStr = genNameString(normalizedNames, shouldDestructure)
  return `import ${namesStr} from ${specifierStr}`
}

export function genExport (specifier: string, namespaced?: Name<'*'>, opts?: ImportOrExportOptions): string
export function genExport (specifier: string, exports?: Name[], opts?: ImportOrExportOptions): string
export function genExport (specifier: string, names?: Name | Name[], opts: ImportOrExportOptions = {}) {
  if (opts.normalizePaths && isAbsolute(specifier)) {
    specifier = normalize(specifier)
  }
  const specifierStr = genString(specifier, opts) + (opts.semi === false ? '' : ';')

  const normalizedNames = normalizeNames(names)
  const shouldDestructure = Array.isArray(names)
  if (!shouldDestructure && !normalizedNames[0].as && normalizedNames[0].name !== '*') {
    throw new Error('Cannot export a module without providing a name')
  }
  const namesStr = genNameString(normalizedNames, shouldDestructure)
  return `export ${namesStr} from ${specifierStr}`
}

// genDynamicImport
export interface DynamicImportOptions extends CodegenOptions {
  comment?: string
  wrapper?: boolean
  interopDefault?: boolean
}

export function genDynamicImport (specifier: string, opts: DynamicImportOptions = {}) {
  const commentStr = opts.comment ? ` /* ${opts.comment} */` : ''
  const wrapperStr = (opts.wrapper === false) ? '' : '() => '
  const ineropStr = opts.interopDefault ? '.then(m => m.default || m)' : ''
  return `${wrapperStr}import(${genString(specifier, opts)}${commentStr})${ineropStr}`
}

// raw generation utils
export function genObjectFromRaw (obj: Record<string, any>, opts: CodegenOptions = {}): string {
  return genObjectFromRawEntries(Object.entries(obj), opts)
}

export function genArrayFromRaw (array: any[], opts: CodegenOptions = {}) {
  const indent = opts.indent ?? ''
  const newIdent = indent !== false && (indent + '  ')
  return wrapInDelimiters(array.map(i => genRawValue(i, { ...opts, indent: newIdent })), { ...opts, indent, delimiters: '[]' })
}

export function genObjectFromRawEntries (array: [key: string, value: any][], opts: CodegenOptions = {}) {
  const indent = opts.indent ?? ''
  const newIdent = indent !== false && (indent + '  ')
  return wrapInDelimiters(array.map(([key, value]) => `${genObjectKey(key, opts)}: ${genRawValue(value, { ...opts, indent: newIdent })}`), { ...opts, indent, delimiters: '{}' })
}

function normalizeNames (names: Name[] | Name) {
  return (Array.isArray(names) ? names : [names]).map((i: Name) => {
    if (typeof i === 'string') { return { name: i } }
    if (i.name === i.as) { i = { name: i.name } }

    return i
  })
}

function genNameString (names: Exclude<Name, string>[], wrap: boolean) {
  const namesStr = names.map(i => i.as ? `${i.name} as ${i.as}` : i.name).join(', ')
  if (wrap) {
    return wrapInDelimiters([namesStr])
  }
  return namesStr
}

interface WrapDelimiterOptions extends CodegenOptions {
  delimiters?: string
}

export function wrapInDelimiters (lines: string[], { lineBreaks = true, delimiters = '{}', indent = false }: WrapDelimiterOptions = {}) {
  if (!lines.length) {
    return delimiters
  }
  const [start, end] = delimiters
  const lineBreak = (indent === false || !lineBreaks) ? ' ' : '\n'
  if (indent !== false && lineBreak) {
    lines = lines.map(l => `${indent}  ${l}`)
  }
  return `${start}${lineBreak}` + lines.join(`,${lineBreak}`) + `${lineBreak}${indent || ''}${end}`
}

export function genString (input: string, opts: CodegenOptions = {}) {
  if (!opts.singleQuotes) {
    // Use JSON.stringify strategy rather than escaping it ourselves
    return JSON.stringify(input)
  }
  return `'${escapeString(input)}'`
}

export function genRawValue (value: unknown, opts: CodegenOptions = {}): string {
  if (typeof value === 'undefined') {
    return 'undefined'
  }
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return genArrayFromRaw(value, opts)
  }
  if (value && typeof value === 'object') {
    return genObjectFromRaw(value, opts)
  }
  return value.toString()
}

// Internal

const VALID_IDENTIFIER_RE = /^[$_]?[\w\d]*$/

function genObjectKey (key: string, opts: CodegenOptions) {
  return key.match(VALID_IDENTIFIER_RE) ? key : genString(key, opts)
}

// https://github.com/rollup/rollup/blob/master/src/utils/escapeId.ts
const NEEDS_ESCAPE_RE = /[\\'\r\n\u2028\u2029]/
const QUOTE_NEWLINE_RE = /(['\r\n\u2028\u2029])/g
const BACKSLASH_RE = /\\/g

function escapeString (id: string): string {
  if (!id.match(NEEDS_ESCAPE_RE)) {
    return id
  }
  return id.replace(BACKSLASH_RE, '\\\\').replace(QUOTE_NEWLINE_RE, '\\$1')
}
