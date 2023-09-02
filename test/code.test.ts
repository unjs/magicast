import { promises as fsp } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadFile, parseModule, writeFile } from "../src";

describe("code", () => {
  it("should load and parse a file", async () => {
    const stub = await loadFile("./test/stubs/config.ts");

    expect(stub).toBeDefined();
    expect(stub.$type).toBe("module");
    expect(stub.$ast).toBeDefined();

    expect(stub.$code).toMatchInlineSnapshot(`
    "export default {
      foo: [\\"a\\"],
    };
    "`);

    const mod = parseModule(
      `
    export default {
      foo: ["a"],
    };
    `,
      { sourceFileName: "./test/stubs/config.ts" }
    );

    expect(stub.exports).toEqual(mod.exports);
  });

  it("should write file from a module", async () => {
    const mod = parseModule(
      `
    export default {
      foo: ["a"],
    };
    `,
      { sourceFileName: "./test/stubs/config.ts" }
    );

    await writeFile(mod, "./test/stubs/config2.ts");

    const stub = await fsp.readFile("./test/stubs/config2.ts", "utf8");

    expect(stub).toMatchInlineSnapshot(`
    "export default {
      foo: [\\"a\\"],
    };"`);
  });
});
