import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from "@babel/types";
import type { ASTNode, GenerateOptions } from "../types";

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

export type ProxifiedArrowFunctionExpression<Params extends any[] = unknown[]> =
  ProxyBase & {
    $type: "arrow-function-expression";
    $params: ProxifiedArray<Params>;
    $body: ProxifiedValue;
  };

export type ProxifiedFunctionExpression<Params extends any[] = unknown[]> =
  ProxyBase & {
    $type: "function-expression";
    $params: ProxifiedArray<Params>;
    $body: ProxifiedBlockStatement;
  };

export type ProxifiedObject<T extends object = object> = {
  [K in keyof T]: Proxified<T[K]>;
} & ProxyBase & {
    $type: "object";
  };

export type ProxifiedIdentifier = ProxyBase & {
  $type: "identifier";
  $name: string;
};

export type ProxifiedLogicalExpression = ProxyBase & {
  $type: "logicalExpression";
};

export type ProxifiedMemberExpression = ProxyBase & {
  $type: "memberExpression";
};

export type ProxifiedBinaryExpression = ProxyBase & {
  $type: "binaryExpression";
  left: Proxified;
  right: Proxified;
  operator: string;
};

export type ProxifiedBlockStatement = ProxyBase & {
  $type: "blockStatement";
  $body: ProxifiedArray;
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
    /** @deprecated Use `$prepend` instead  */
    $add: (item: ImportItemInput) => void;
    $prepend: (item: ImportItemInput) => void;
    $append: (item: ImportItemInput) => void;
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
  | ProxifiedIdentifier
  | ProxifiedLogicalExpression
  | ProxifiedMemberExpression
  | ProxifiedObject
  | ProxifiedModule
  | ProxifiedImportsMap
  | ProxifiedImportItem
  | ProxifiedArrowFunctionExpression
  | ProxifiedFunctionExpression
  | ProxifiedBinaryExpression
  | ProxifiedBlockStatement;

export type ProxyType = ProxifiedValue["$type"];
