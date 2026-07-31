import fs from "node:fs";
import fsp from "node:fs/promises";
import { join } from "node:path";
import { downloadTemplate } from "giget";

// This script clones recast and patches, and then re-bundle it so we get rid of the unnecessary polyfills

async function cloneRecast() {
  if (fs.existsSync("vendor/recast")) {
    console.log("vendor/recast already exists");
  } else {
    // Clone recast
    await downloadTemplate("github:benjamn/recast#v0.23.18", {
      dir: "vendor/recast",
    });

    // Remove the tsconfig.json so it's targeting newer node versions
    await fsp.rm("vendor/recast/tsconfig.json");

    // Neutralize the internal consistency assertions. recast asserts things
    // like `lines instanceof Lines`, which don't survive bundling (class
    // identity gets duplicated across chunks) and would throw at runtime.
    // Replace the `tiny-invariant` import with a local no-op so the assertion
    // never throws, while still evaluating its arguments (some carry side
    // effects, e.g. `sourceLines.nextPos(...)`). Also strip the legacy `assert`
    // import/usage kept for older recast revisions.
    await Promise.all(
      fs
        .readdirSync("vendor/recast/lib", { withFileTypes: true })
        .map(async (file) => {
          if (!file.isFile()) {
            return;
          }
          return await filterLines(join(file.parentPath, file.name), (line) => {
            if (line.startsWith('import invariant from "tiny-invariant"')) {
              return "const invariant = (_condition?: unknown, _message?: string): void => {};";
            }
            if (line.startsWith("import assert from")) {
              return false;
            }
            if (/^\s*assert\./.test(line)) {
              if (line.endsWith(";")) {
                return false;
              }
              return `// @ts-ignore \n false && ` + line;
            }
            return line;
          });
        }),
    );

    // Remove the require(), and since we are providing our own parser anyway
    await filterLines("vendor/recast/lib/options.ts", (line) => {
      if (line.includes('parser: require("../parsers/esprima")')) {
        return false;
      }
      return line;
    });

    await filterLines("vendor/recast/lib/parser.ts", (line) => {
      return line.replace('require("esprima")', `false && require("")`);
    });

    await filterLines("vendor/recast/lib/util.ts", (line) => {
      if (line.includes(String.raw`isBrowser() ? "\n"`)) {
        return String.raw`return "\n"`;
      }
      return line;
    });

    // `Options` is a type-only interface; import/export it as a type so the
    // bundler doesn't treat it as a missing value export after type stripping
    await filterLines("vendor/recast/main.ts", (line) => {
      if (
        /^(import|export) \{ Options \} from "\.\/lib\/options";/.test(line)
      ) {
        return line.replace(/^(import|export) /, "$1 type ");
      }
      return line;
    });

    console.log("vendor/recast cloned");
  }
}

async function cloneAstTypes() {
  if (fs.existsSync("vendor/ast-types")) {
    console.log("vendor/ast-types already exists");
  } else {
    // Clone recast
    await downloadTemplate("github:benjamn/ast-types#v0.16.1", {
      dir: "vendor/ast-types",
    });

    // Remove the tsconfig.json so it's targeting newer node versions
    await fsp.rm("vendor/ast-types/tsconfig.json");

    // Add import type
    await filterLines("vendor/ast-types/src/main.ts", (line) => {
      if (/^import\s*{\s*(ASTNode|Visitor)/.test(line)) {
        return line.replace(/^import /, "import type ");
      }
      return line;
    });

    // Comment out the body of `maybeSetModuleExports`: it reassigns
    // `module.exports`, which throws when the vendored ESM source is executed
    // directly (e.g. by vitest) because the module namespace is read-only.
    let inMaybeSetModuleExports = false;
    let inMaybeSetModuleExportsBody = false;
    await filterLines("vendor/ast-types/src/shared.ts", (line) => {
      if (line.startsWith("export function maybeSetModuleExports(")) {
        inMaybeSetModuleExports = true;
        return line;
      }
      if (inMaybeSetModuleExports && !inMaybeSetModuleExportsBody) {
        if (line === ") {") {
          inMaybeSetModuleExportsBody = true;
        }
        return line;
      }
      if (inMaybeSetModuleExportsBody) {
        if (line === "}") {
          inMaybeSetModuleExports = false;
          inMaybeSetModuleExportsBody = false;
          return line;
        }
        if (line.trim() === "") {
          return line;
        }
        return line.replace(/^ {4}/, "    // ");
      }
      return line;
    });

    console.log("vendor/ast-types cloned");
  }
}

async function filterLines(
  file: string,
  filter: (line: string, index: number) => boolean | string,
) {
  const content = await fsp.readFile(file, "utf8");
  const lines = content.split("\n");
  const newContent = lines
    .map((i, idx) => filter(i, idx))
    .filter((i) => i !== false)
    .join("\n");
  if (newContent !== content) {
    await fsp.writeFile(file, newContent);
  }
}

await Promise.all([cloneRecast(), cloneAstTypes()]);
