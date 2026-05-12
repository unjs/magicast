 import { describe, expect, it } from "vitest";
 import { builders, parseModule } from "magicast";
 import { generate } from "../_utils";

 describe("builders/awaitExpression", () => {
   it("basic await expression", async () => {
     const expr = builders.awaitExpression(
       builders.functionCall("fetch", "https://example.com"),
     );
     expect(expr.$type).toBe("await-expression");

     const mod = parseModule("");
     mod.exports.a = expr;

     expect(await generate(mod)).toMatchInlineSnapshot(`
       "export const a = await fetch("https://example.com");"
     `);
   });

   it("await with raw expression", async () => {
     const expr = builders.awaitExpression(
       builders.raw('import("./module")'),
     );
     expect(expr.$type).toBe("await-expression");

     const mod = parseModule("");
     mod.exports.a = expr;

     expect(await generate(mod)).toMatchInlineSnapshot(`
       "export const a = await import("./module");"
     `);
   });

   it("parse existing await expression", async () => {
     const mod = parseModule('export const a = await fetch("https://example.com");');
     const a = mod.exports.a;
     expect(a.$type).toBe("await-expression");
     expect(a.$argument.$type).toBe("function-call");
     expect(a.$argument.$callee).toBe("fetch");
   });
 });