import type { AwaitExpression } from "@babel/types";
import type { ProxifiedAwaitExpression, ProxifiedModule } from "./types";
import { MagicastError } from "../error";
import { proxify } from "./proxify";
import { createProxy } from "./_utils";

export function proxifyAwaitExpression(
   node: AwaitExpression,
   mod?: ProxifiedModule,
 ): ProxifiedAwaitExpression {
   if (node.type !== "AwaitExpression") {
     throw new MagicastError("Not an await expression");
   }
   return createProxy(
     node,
     {
       $type: "await-expression",
       $argument: proxify(node.argument, mod),
     },
     {},
   ) as ProxifiedAwaitExpression;
 }