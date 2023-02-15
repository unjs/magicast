import { ESNode } from "../types";

export interface ProxyBase {
  $ast: ESNode;
}

export type ProxyUtils = ProxyBase &
  (
    | {
        $type: "function-call";
        arguments: Proxified[];
        name: string;
      }
    | {
        $type: "object";
      }
    | {
        $type: "array";
      }
  );

export type ProxyType = ProxyUtils["$type"];

export type Proxified<T = any> = T extends
  | number
  | string
  | null
  | undefined
  | boolean
  | bigint
  | symbol
  ? T
  : T extends object
  ? {
      [K in keyof T]: Proxified<T[K]>;
    } & ProxyUtils
  : T;
