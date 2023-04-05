import {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from "@babel/types";
import { ASTNode, GenerateOptions } from "../types";

export interface ProxyBase {
  $ast: ASTNode;
}

export type ProxifiedArray<T extends any[] = unknown[]> = {
  [K in keyof T]: Proxified<T[K]>;
} & ProxyBase & {
    $type: "array";
  };

export type ProxifiedFunctionCall<Args extends any[] = unknown[]> =
  ProxyBase & {
    $type: "function-call";
    $args: ProxifiedArray<Args>;
    $callee: string;
  };

export type ProxifiedNewExpression<Args extends any[] = unknown[]> =
  ProxyBase & {
    $type: "new-expression";
    $args: ProxifiedArray<Args>;
    $callee: string;
  };

export type ProxifiedObject<T extends object = object> = {
  [K in keyof T]: Proxified<T[K]>;
} & ProxyBase & {
    $type: "object";
  };

export type Proxified<T = any> = T extends
  | number
  | string
  | null
  | undefined
  | boolean
  | bigint
  | symbol
  ? T
  : T extends any[]
  ? {
      [K in keyof T]: Proxified<T[K]>;
    } & ProxyBase & {
        $type: "array";
      }
  : T extends object
  ? ProxyBase & {
      [K in keyof T]: Proxified<T[K]>;
    } & {
      $type: "object";
    }
  : T;

export type ProxifiedModule<T extends object = Record<string, any>> =
  ProxyBase & {
    $type: "module";
    $code: string;
    exports: ProxifiedObject<T>;
    imports: ProxifiedImportsMap;
    generate: (options?: GenerateOptions) => { code: string; map?: any };
  };

export type ProxifiedImportsMap = Record<string, ProxifiedImportItem> &
  ProxyBase & {
    $type: "imports";
    $add: (item: ImportItemInput) => void;
    $items: ProxifiedImportItem[];
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

export type ProxifiedValue =
  | ProxifiedArray
  | ProxifiedFunctionCall
  | ProxifiedNewExpression
  | ProxifiedObject
  | ProxifiedModule
  | ProxifiedImportsMap
  | ProxifiedImportItem;

export type ProxyType = ProxifiedValue["$type"];
