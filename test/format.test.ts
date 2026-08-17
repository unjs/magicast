import { expect, it, describe } from "vitest";
import {
  CodeFormatOptions,
  detectCodeFormat,
  generateCode,
  parseModule,
} from "magicast";

describe("format", () => {
  const cases: Array<{
    name: string;
    code: string;
    todo?: boolean;
    format: CodeFormatOptions;
  }> = [
    {
      name: "single quote",
      code: "console.log('hello')",
      format: { quote: "single" },
    },
    {
      name: "double quote",
      code: 'console.log("hello")',
      format: { quote: "double" },
    },
    {
      name: "indent 2",
      code: '// hello;  if (test)\n    {console.log("hello")\n  }    ',
      format: { tabWidth: 2, useTabs: false },
    },
    {
      name: "indent 2 + tabs",
      code: '// hello;\tif (test)\n\t\t{console.log("hello")\n\t}    ',
      format: { tabWidth: 1, useTabs: true },
    },
    {
      name: "parans",
      code: "const test = (a) => a + 1",
      format: { arrowParensAlways: true },
    },
    {
      name: "no parans",
      code: "const test = a => a + 1",
      format: { arrowParensAlways: false },
    },
    {
      name: "semi",
      code: "console.log('hello');",
      format: { useSemi: true },
    },
    {
      name: "no semi",
      code: "console.log('hello')",
      format: { useSemi: false },
    },
    {
      name: "trailing comma (multi line)",
      code: "console.log(['hello',\n'world',\n])",
      format: { trailingComma: true },
    },
    {
      name: "trailing comma (single line)",
      code: "console.log(['hello', 'world',])",
      format: { trailingComma: true },
    },
  ];

  for (const testCase of cases) {
    (testCase.todo ? it.todo : it)(testCase.name, () => {
      const detectedFormat = detectCodeFormat(testCase.code);
      expect(detectedFormat).toMatchObject(testCase.format);
    });
  }

  it("omits undetected options instead of returning them as undefined", () => {
    // recast resolves its defaults with `hasOwnProperty`, so an own key holding
    // `undefined` shadows the default instead of falling back to it.
    const detectedFormat = detectCodeFormat("console.log('hello')");
    expect(Object.keys(detectedFormat)).not.toContain("objectCurlySpacing");
    expect(Object.keys(detectedFormat)).not.toContain("arrayBracketSpacing");
  });

  it("keeps object curly spacing when generating code", () => {
    const mod = parseModule("import { defineConfig } from 'vite'\n");
    mod.imports.$add({ from: "vite-plugin-pwa", imported: "VitePWA" });
    expect(generateCode(mod).code).toContain(
      "import { VitePWA } from 'vite-plugin-pwa'",
    );
  });

  it("respects an explicit objectCurlySpacing override", () => {
    const mod = parseModule("import { defineConfig } from 'vite'\n");
    mod.imports.$add({ from: "vite-plugin-pwa", imported: "VitePWA" });
    expect(
      generateCode(mod, { format: { objectCurlySpacing: false } }).code,
    ).toContain("import {VitePWA} from 'vite-plugin-pwa'");
  });
});
