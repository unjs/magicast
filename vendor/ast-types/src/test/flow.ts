import assert from "assert";
import flowParser from "flow-parser";
import forkFn from "../fork";
import flowDef from "../def/flow";
import { ASTNode } from "../types";
import { NodePath } from "../node-path";
import { Visitor } from "../gen/visitor";
import { Context } from "../path-visitor";

var types = forkFn([
  flowDef,
]);

describe("flow types", function () {
  it("issue #242", function () {
    const parser = {
      parse(code: string) {
        return flowParser.parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "class A<B> extends C<D> {}",
      "function f<E>() {}",
    ].join("\n"));

    const identifierNames: any[] = [];
    const typeParamNames: any[] = []

    types.visit(program, {
      visitIdentifier(path: any) {
        identifierNames.push(path.node.name);
        this.traverse(path);
      },

      visitTypeParameter(path: any) {
        typeParamNames.push(path.node.name);
        this.traverse(path);
      }
    });

    assert.deepEqual(identifierNames, ["A", "C", "D", "f"]);
    assert.deepEqual(typeParamNames, ["B", "E"]);
  });

  it("issue #261", function () {
    const parser = {
      parse(code: string) {
        return flowParser.parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse('declare module.exports: {};');

    assert.strictEqual(program.body[0].type, 'DeclareModuleExports');
    assert.notEqual(program.body[0].typeAnnotation, undefined);
    assert.strictEqual(program.body[0].typeAnnotation.type, 'TypeAnnotation');
  });

  it("Explicit type arguments", function () {
    const parser = {
      parse(code: string) {
        return flowParser.parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      'test<A>();',
      'test<B, C>();',
      'new test<D>();',
      'new test<E, F>();',
    ].join("\n"));
    
    const typeParamNames: any[] = []

    types.visit(program, {
      visitGenericTypeAnnotation(path: any) {
        typeParamNames.push(path.node.id.name);
        this.traverse(path);
      }
    });

    assert.deepEqual(typeParamNames, ["A", "B", "C", "D", "E", "F"]);
  });

  describe('scope', () => {
    const scope = [
      "type Foo = {}",
      "interface Bar {}"
    ];
  
    const ast = flowParser.parse(scope.join("\n"));
  
    it("should register flow types with the scope", function() {  
      types.visit(ast, {
        visitProgram(path: any) {
          assert(path.scope.declaresType('Foo'));
          assert(path.scope.declaresType('Bar'));
          assert.equal(path.scope.lookupType('Foo').getTypes()['Foo'][0].parent.node.type, 'TypeAlias');
          assert.equal(path.scope.lookupType('Bar').getTypes()['Bar'][0].parent.node.type, 'InterfaceDeclaration');
          return false;
        }
      });
    });
  });

  function assertVisited(node: ASTNode, visitors: Visitor<any>): any {
    const visitedSet: Set<string> = new Set();
    const wrappedVisitors: Visitor<any> = {}
    for (const _key of Object.keys(visitors)) {
      const key = _key as keyof Visitor<any>
      wrappedVisitors[key] = function (this: Context, path: NodePath<any>) {
        visitedSet.add(key);
        (visitors[key] as any)?.call(this, path)
      }
    }
    types.visit(node, wrappedVisitors);

    for (const key of Object.keys(visitors)) {
      assert.equal(visitedSet.has(key), true);
    }
  }

  it("issue #294 - function declarations", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "function foo<T>(): T { }",
      "let bar: T",
    ].join("\n"));

    assertVisited(program, {
      visitFunctionDeclaration(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        assert.equal(path.scope.lookupType('T'), null);
        this.traverse(path);
      }
    });
  });

  it("issue #294 - function expressions", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "const foo = function <T>(): T { }",
      "let bar: T",
    ].join("\n"));

    assertVisited(program, {
      visitFunctionExpression(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        if (path.node.id.type === 'Identifier' && path.node.id.name === 'bar') {
          assert.equal(path.scope.lookupType('T'), null);
        }
        this.traverse(path);
      }
    });
  });

  it("issue #294 - arrow function expressions", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "const foo = <T>(): T => { }",
      "let bar: T"
    ].join("\n"));

    assertVisited(program, {
      visitArrowFunctionExpression(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        assert.equal(path.scope.lookupType('T'), null);
        this.traverse(path);
      }
    });
  });

  it("issue #294 - class declarations", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "class Foo<T> extends Bar<Array<T>> { }",
      "let bar: T"
    ].join("\n"));

    assertVisited(program, {
      visitTypeParameterInstantiation(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        assert.equal(path.scope.lookupType('T'), null);
        this.traverse(path);
      }
    });
  });

  it("issue #294 - class expressions", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "const foo = class Foo<T> extends Bar<Array<T>> { }",
      "let bar: T"
    ].join("\n"));

    assertVisited(program, {
      visitTypeParameterInstantiation(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        if (path.node.id.type === 'Identifier' && path.node.id.name === 'bar') {
          assert.equal(path.scope.lookupType('T'), null);
          assert.equal(path.scope.lookupType('Foo'), null);
        }
        this.traverse(path);
      }
    });
  });

  it("issue #296 - interface declarations", function () {
    const parser = {
      parse(code: string) {
        return require('flow-parser').parse(code, {
          types: true
        });
      }
    };

    const program = parser.parse([
      "interface Foo<T> extends Bar<Array<T>> { }",
      "let bar: T"
    ].join("\n"));

    assertVisited(program, {
      visitTypeParameterInstantiation(path) {
        assert.ok(path.scope.lookupType('T'));
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        assert.equal(path.scope.lookupType('T'), null);
        assert.ok(path.scope.lookupType('Foo'));
        this.traverse(path);
      }
    });
  });
});
