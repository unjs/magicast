import * as babelParser from "@babel/parser";
import type { ParserOptions, ParserPlugin } from "@babel/parser";

let _babelParser: { parse: typeof babelParser.parse } | undefined;

export function getBabelParser() {
  if (_babelParser) {
    return _babelParser;
  }
  const babelOptions = _getBabelOptions();
  _babelParser = {
    parse(source: string, options?: ParserOptions) {
      return babelParser.parse(source, {
        ...babelOptions,
        ...options,
      }) as any;
    },
  };
  return _babelParser;
}

function _getBabelOptions(): ParserOptions & { plugins: ParserPlugin[] } {
  // The goal here is to tolerate as much syntax as possible, since Recast
  // is not in the business of forbidding anything. If you want your
  // parser to be more restrictive for some reason, you can always pass
  // your own parser object to recast.parse.
  return {
    sourceType: "module",
    strictMode: false,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    startLine: 1,
    tokens: true,
    plugins: [
      "asyncGenerators",
      "bigInt",
      "classPrivateMethods",
      "classPrivateProperties",
      "classProperties",
      "classStaticBlock",
      "decimal",
      "decorators-legacy",
      "doExpressions",
      "dynamicImport",
      "exportDefaultFrom",
      "exportExtensions" as any as ParserPlugin,
      "exportNamespaceFrom",
      "functionBind",
      "functionSent",
      "importAssertions",
      "importMeta",
      "nullishCoalescingOperator",
      "numericSeparator",
      "objectRestSpread",
      "optionalCatchBinding",
      "optionalChaining",
      [
        "pipelineOperator",
        {
          proposal: "minimal",
        },
      ] as any as ParserPlugin,
      [
        "recordAndTuple",
        {
          syntaxType: "hash",
        },
      ],
      "throwExpressions",
      "topLevelAwait",
      "v8intrinsic",
      "jsx",
      "typescript",
    ],
  };
}
