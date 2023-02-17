import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from "@babel/types";
import { ESNode } from "../types";

export interface ProxyBase {
  $ast: ESNode;
}

export type ProxyUtils = ProxyBase &
  (
    | {
        $type: "function-call";
        $args: Proxified;
        $callee: string;
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

export interface ProxifiedModule<T = Record<string, unknown>> {
  $exports: Proxified<T>;
  $imports: ProxifiedImportsMap;
}

export type ProxifiedImportsMap = Record<string, ProxifiedImportItem> &
  ProxyBase & {
    $type: "imports";
    $add: (item: ImportItemInput) => void;
  };

export interface ProxifiedImportItem extends ProxyBase {
  $type: "import";
  $ast: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier;
  $declaration: ImportDeclaration;
  imported: string;
  local: string;
  from: string;
}

export interface ImportItemInput {
  local?: string;
  imported: string;
  from: string;
}
