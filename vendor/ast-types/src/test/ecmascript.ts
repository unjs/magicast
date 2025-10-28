import assert from "assert";
import { parse, Syntax } from "esprima";
import * as espree from "espree";
import * as esprimaFb from "esprima-fb";
import { Literal } from "estree";
import * as babelTypes from "@babel/types";
import fork from "../fork";
import {
  Type,
  namedTypes as n,
  builders as b,
  Path,
  NodePath,
  PathVisitor,
  builtInTypes as builtin,
  use,
  getSupertypeNames,
  getFieldValue,
  eachField,
  visit,
  defineMethod,
  astNodesAreEquivalent,
} from "../main";
import {
  babylonParse,
  validateECMAScript,
  isEarlyStageProposalType,
} from "./shared";
import typesPlugin from "../types";
import esprimaDef from "../def/esprima";
import coreDef from "../def/core";
import es6Def from "../def/es6";
import esProposalsDef from "../def/es-proposals";
import babelDef from "../def/babel";

const {
  RegExp: isRegExp,
  string: isString,
} = builtin;

var rawTypes = use(typesPlugin);

var hasOwn = Object.prototype.hasOwnProperty;
var nodeMajorVersion = parseInt(process.versions.node, 10);

// Type alias to indicate when we're intentionally passing invalid types.
type $InvalidType = any;

describe("basic type checking", function() {
  var fooId = b.identifier("foo");
  var ifFoo = b.ifStatement(fooId, b.blockStatement([
    b.expressionStatement(b.callExpression(fooId, []))
  ]));

  it("should exhibit sanity", function() {
    assert.ok(n.IfStatement.check(ifFoo));
    assert.ok(n.Statement.check(ifFoo));
    assert.ok(n.Node.check(ifFoo));

    assert.ok(n.BlockStatement.check(ifFoo.consequent));
    if (n.BlockStatement.check(ifFoo.consequent)) {
      var statement = ifFoo.consequent.body[0];

      assert.ok(n.ExpressionStatement.check(statement));
      if (n.ExpressionStatement.check(statement)) {
        var callExpression = statement.expression;

        assert.ok(n.CallExpression.check(callExpression));
        if (n.CallExpression.check(callExpression)) {
          assert.strictEqual(callExpression.arguments.length, 0);
        }
      }
    }

    assert.strictEqual(ifFoo.test, fooId);
    assert.ok(n.Expression.check(ifFoo.test));
    assert.ok(n.Identifier.check(ifFoo.test));
    assert.ok(!n.Statement.check(ifFoo.test));
    assert.equal(
      b.importDeclaration(
        [b.importDefaultSpecifier(b.identifier("foo"))], b.literal("bar")
      ).importKind,
      "value"
    );
    assert.throws(function () {
      b.importDeclaration(
        [b.importDefaultSpecifier(b.identifier("foo"))],
        b.literal("bar"),
        "baz" as $InvalidType
      )
    });
    assert.ok(n.ImportDeclaration.check(
      b.importDeclaration(
        [b.importDefaultSpecifier(b.identifier("foo"))], b.literal("bar"),
        "type")
    ));
    assert.ok(n.ImportDeclaration.check(
      b.importDeclaration(
        [b.importNamespaceSpecifier(b.identifier("foo"))], b.literal("bar"))
    ));
  });
});

describe("builders", function() {
  it("should build types using positional arguments", function() {
    var fooId = b.identifier("foo");
    var consequent = b.blockStatement([
      b.expressionStatement(b.callExpression(fooId, []))
    ]);
    var ifFoo = b.ifStatement(fooId, consequent);

    assert.ok(n.Identifier.check(fooId));
    assert.ok(n.IfStatement.check(ifFoo));
    assert.ok(n.Statement.check(ifFoo));

    assert.strictEqual(fooId.name, "foo");
    assert.strictEqual(fooId.optional, false);

    assert.strictEqual(ifFoo.test, fooId);
    assert.strictEqual(ifFoo.consequent, consequent);
    assert.strictEqual(ifFoo.alternate, null);
  });

  it("should build types using `.from`", function() {
    var fooId = b.identifier.from({
      name: "foo",
      optional: true
    });
    var consequent = b.blockStatement.from({
      body: [
        b.expressionStatement.from({
          expression: b.callExpression.from({ callee: fooId, arguments: [] })
        })
      ]
    });
    var ifFoo = b.ifStatement.from({
      test: fooId,
      consequent: consequent
    });

    assert.ok(n.Identifier.check(fooId));
    assert.ok(n.IfStatement.check(ifFoo));
    assert.ok(n.Statement.check(ifFoo));

    assert.strictEqual(fooId.name, "foo");
    assert.strictEqual(fooId.optional, true);

    assert.strictEqual(ifFoo.test, fooId);
    assert.strictEqual(ifFoo.consequent, consequent);
    assert.strictEqual(ifFoo.alternate, null);
  });
});

describe("isSupertypeOf", function() {
  it("should report correct supertype relationships", function() {
    var def = Type.def;

    assert.ok(def("Node").isSupertypeOf(def("Node")));
    assert.ok(def("Node").isSupertypeOf(def("Expression")));
    assert.ok(!def("Expression").isSupertypeOf(def("Node")));
    assert.ok(!def("Expression").isSupertypeOf(
      def("DebuggerStatement")));

    // TODO Make this test case more exhaustive.
  });
});

describe("supertype lookup", function() {
  it("should resolve the most precise supertypes", function() {
    var table = use(typesPlugin).computeSupertypeLookupTable({
      Function: true,
      Declaration: true,
      ArrowFunctionExpression: true,
      Expression: true,
      Identifier: true
    });

    function check(subtype: string, expectedSupertype?: string) {
      assert.strictEqual(table[subtype], expectedSupertype);
    }

    check("FunctionExpression", "Function");
    check("FunctionDeclaration", "Function");
    check("VariableDeclaration", "Declaration");
    check("Identifier", "Identifier");
    check("ArrowFunctionExpression", "ArrowFunctionExpression");
    check("ForInStatement");
    check("Node");
    check("ThisExpression", "Expression");
    check("Property");
  });

  it("should properly linearize the inheritance hierarchy", function() {
    assert.deepEqual(
      getSupertypeNames("FunctionExpression"),
      ["Function", "Expression", "Node", "Printable"]
    );
  });

  it("should trigger an AssertionError for unknown types", function() {
    assert.throws(function() {
      getSupertypeNames("AlienBoomerangDeclaration");
    });
  });
});

describe("shallow and deep checks", function() {
  var index = b.identifier("foo");
  var decl = b.variableDeclaration("var", [
    b.variableDeclarator(
      index,
      b.literal(42)
    )
  ]);

  it("should work when shallow", function() {
    assert.ok(n.Node.check(decl));
    assert.ok(n.Statement.check(decl));
    assert.ok(n.Declaration.check(decl));
    assert.ok(n.VariableDeclaration.check(decl));
  });

  it("should work when deep", function() {
    assert.ok(n.Node.check(decl, true));
    assert.ok(n.Statement.check(decl, true));
    assert.ok(n.Declaration.check(decl, true));
    assert.ok(n.VariableDeclaration.check(decl, true));
  });

  it("should fail when expected", function() {
    // Not an Expression.
    assert.strictEqual(n.Expression.check(decl), false);

    // This makes decl cease to conform to n.VariableDeclaration.
    decl.declarations.push(b.literal("bar") as $InvalidType);

    assert.ok(n.Node.check(decl));
    assert.ok(n.Statement.check(decl));
    assert.ok(n.Declaration.check(decl));
    assert.ok(n.VariableDeclaration.check(decl));

    assert.ok(!n.Node.check(decl, true));
    assert.ok(!n.Statement.check(decl, true));
    assert.ok(!n.Declaration.check(decl, true));

    // As foretold above.
    assert.ok(!n.VariableDeclaration.check(decl, true));

    // Still not an Expression.
    assert.ok(!n.Expression.check(decl));
  });

  var fs = b.forStatement(
    decl,
    b.binaryExpression("<", index, b.literal(48)),
    b.updateExpression("++", index, true),
    b.blockStatement([
      b.expressionStatement(
        b.callExpression(index, [])
      )
    ])
  );

  it("should disagree according to depth", function() {
    assert.ok(n.Node.check(fs));
    assert.ok(n.Statement.check(fs));
    assert.ok(n.ForStatement.check(fs));

    // Not a true ForStatement because fs.init is not a true
    // VariableDeclaration.
    assert.ok(!n.Node.check(fs, true));
    assert.ok(!n.Statement.check(fs, true));
    assert.ok(!n.ForStatement.check(fs, true));
  });
});


describe("whole-program validation", function() {
  this.timeout(20000);

  validateECMAScript("test/data/backbone.js");
  validateECMAScript("test/data/jquery-1.9.1.js");
});

describe("esprima Syntax types", function() {
  const { def, hasDef } = Type;
  const typeNames: any = {};

  function addTypeName(name: any) {
    if (isEarlyStageProposalType(name)) {
      return;
    }
    typeNames[name] = name;
  }

  Object.keys(Syntax).forEach(addTypeName);
  Object.keys(esprimaFb.Syntax).forEach(addTypeName);
  Object.keys((babelTypes as any).VISITOR_KEYS).forEach(addTypeName);

  it("should all be buildable", function() {
    Object.keys(typeNames).forEach(function(name) {
      assert.ok(hasOwn.call(n, name), name);
      assert.strictEqual(hasDef(name) && def(name).buildable, true, name);
    });
  });

  it("builders for subtypes of Expression should have equivalent ExpressionStatement builders", function() {
    Object.keys(typeNames).forEach(function(name) {
      if (hasDef(name) && def(name).buildable &&
          def("Expression").isSupertypeOf(def(name))) {
        var statementBuilderName = rawTypes.getStatementBuilderName(name);
        assert.ok(b[statementBuilderName], name + ":" +statementBuilderName);
      }
    });

    // sanity check
    var expStmt = b.assignmentStatement("=", b.identifier("a"), b.identifier("b"));
    assert.strictEqual(expStmt.type, "ExpressionStatement");
  });
});

describe("types.getFieldValue", function() {
  it("should work for explicit fields", function() {
    assert.strictEqual(
      getFieldValue({
        type: "CatchClause"
      }, "type"),
      "CatchClause"
    );

    assert.strictEqual(
      getFieldValue({
        type: "CatchClause",
        guard: b.identifier("test")
      }, "guard").name,
      "test"
    );
  });

  it("should work for implicit/default fields", function() {
    assert.strictEqual(
      getFieldValue({
        type: "CatchClause"
      }, "guard"),
      null
    );

    assert.strictEqual(
      getFieldValue({
        type: "CatchClause"
      }, "asdf"),
      void 0
    );

    assert.deepEqual(
      getFieldValue({
        type: "TryStatement",
      }, "handler"),
      null
    );

    assert.deepEqual(
      getFieldValue({
        type: "TryStatement",
      }, "handlers"),
      []
    );

    assert.deepEqual(
      getFieldValue({
        type: "TryStatement",
      }, "guardedHandlers"),
      []
    );
  });

  it("should work for explicitly undefined fields", function() {
    assert.deepEqual(
      getFieldValue({
        type: "TryStatement",
        guardedHandlers: void 0
      }, "guardedHandlers"),
      []
    );
  });

  it("should handle undefined objects", function() {
    assert.equal(
      getFieldValue(undefined, "name"),
      undefined
    );
  });
});

describe("types.eachField", function() {
  var context = {};

  function check(node: any, names: any) {
    var seen: any[] = [];

    eachField(node, function(this: any, name: any, value: any) {
      assert.strictEqual(this, context);
      if (name === "type")
        assert.strictEqual(node.type, value);
      seen.push(name);
    }, context);

    assert.deepEqual(seen.sort(), names.sort());
  }

  it("should give correct keys for supertypes", function() {
    check({ type: "Expression" }, ["type"]);
  });

  it("should work for non-buildable types", function() {
    check({ type: "Position" }, [
      "line", "column"
    ]);

    check({ type: "SourceLocation" }, [
      "start", "end", "source"
    ]);
  });

  it("should respect hidden fields", function() {
    check({ type: "TryStatement" }, [
      // Note that the "handlers" field is now hidden from eachField.
      "type", "block", "handler", "guardedHandlers", "finalizer"
    ]);
  });

  check({ type: "CatchClause" }, [
    "type", "param", "guard", "body"
  ]);

  it("should complain about invalid types", function() {
    try {
      check({ type: "asdf" }, ["type"]);
      throw new Error("should have thrown");
    } catch (e: any) {
      assert.strictEqual(
        e.message,
        'did not recognize object of type "asdf"'
      );
    }
  });

  it("should infer SourceLocation types", function() {
    check({
      line: 10,
      column: 37
    }, ["line", "column"]);
  });
});

describe("types.visit", function() {
  var call = b.expressionStatement(
    b.callExpression(
      b.memberExpression(
        b.identifier("foo"),
        b.identifier("bar"),
        false
      ),
      [b.literal("baz")]
    )
  );

  var ts = b.tryStatement(
    b.blockStatement([call, call]),
    b.catchClause(
      b.identifier("err"),
      null,
      b.blockStatement([])
    )
  );

  it("should have correct .parent path", function() {
    var literalCount = 0;

    n.TryStatement.assert(visit(ts, {
      visitLiteral: function(path) {
        var node = path.node;
        literalCount += 1;
        assert.strictEqual(node.value, "baz");
        assert.strictEqual(path.parent.node, call.expression);
        assert.strictEqual(path.parent.parent.node, call);
        assert.strictEqual(path.parent.parent.parent.node, ts.block);
        assert.strictEqual(path.parent.parent.parent.parent.node, ts);
        assert.strictEqual(path.parent.parent.parent.parent.parent, null);
        this.traverse(path);
      }
    }), true);

    assert.strictEqual(literalCount, 2);
  });

  it("should abort subtree traversal when false returned", function() {
    var ids: any = {};

    visit(ts, {
      visitMemberExpression: function(_path: any) {
        return false;
      },

      visitIdentifier: function(path) {
        ids[path.node.name] = true;
        this.traverse(path);
      }
    });

    // Make sure all identifers beneath member expressions were skipped.
    assert.deepEqual(ids, { err: true });

    ids = {};

    visit(ts, {
      visitIdentifier: function(path) {
        ids[path.node.name] = true;
        this.traverse(path);
      }
    });

    // Now make sure those identifiers (foo and bar) were visited.
    assert.deepEqual(ids, {
      err: true,
      foo: true,
      bar: true
    });
  });

  it("this.abort() should abort entire traversal", function() {
    var literal = "not visited";
    var unvisitedTypes: any[] = [];
    var root = visit(call, {
      visitIdentifier: function(path) {
        if (path.value.name === "foo") {
          this.abort();
        }
      },

      visitLiteral: function(path) {
        literal = path.value;
        this.traverse(path);
      },

      visitNode: function(path) {
        unvisitedTypes.push(path.value.type);
        this.traverse(path);
      }
    });

    assert.strictEqual(root, call);
    assert.strictEqual(literal, "not visited");
    assert.deepEqual(unvisitedTypes, [
      "ExpressionStatement",
      "CallExpression",
      "MemberExpression"
    ]);
  });

  it("this.abort() should be cancelable", function() {
    var literal: any = "not visited";
    var unvisitedTypes: any[] = [];
    var root = visit(call, {
      visitIdentifier: function(path) {
        if (path.value.name === "foo") {
          this.abort();
        }
      },

      visitMemberExpression: function(path) {
        try {
          this.traverse(path);
        } catch (err: any) {
          assert.ok(err instanceof this.AbortRequest);
          err.cancel();
        }
      },

      visitLiteral: function(path) {
        literal = path.value;
        this.traverse(path);
      },

      visitNode: function(path) {
        unvisitedTypes.push(path.value.type);
        this.traverse(path);
      }
    });

    assert.strictEqual(root, call);

    n.Literal.assert(literal);
    assert.strictEqual(literal.value, "baz");

    n.CallExpression.assert(call.expression);
    if (n.CallExpression.check(call.expression)) {
      assert.strictEqual(literal, call.expression.arguments[0]);
    }

    assert.deepEqual(unvisitedTypes, [
      "ExpressionStatement",
      "CallExpression"
      // Note that the MemberExpression and the Literal were visited
      // by their type-specific methods, so they were not visited by
      // the catch-all visitNode method.
    ]);
  });

  it("should visit comments", function() {
    var ast = parse([
      "function getArgs(/*arguments*/) {",
      "  // Turn arguments into an array.",
      "  return Array.prototype.slice.call(arguments);",
      "}"
    ].join("\n"), {
      comment: true
    });

    var blockComments: any[] = [];
    var lineComments: any[] = [];

    visit(ast, {
      visitComment: function(path) {
        this.traverse(path);
        if (n.Block.check(path.value)) {
          blockComments.push(path.value);
        } else if (n.Line.check(path.value)) {
          lineComments.push(path.value);
        }
      }
    });

    assert.strictEqual(blockComments.length, 1);
    assert.strictEqual(blockComments[0].value, "arguments");

    assert.strictEqual(lineComments.length, 1);
    assert.strictEqual(
      lineComments[0].value,
      " Turn arguments into an array."
    );

    blockComments.length = 0;
    lineComments.length = 0;

    visit(ast, {
      visitBlock: function(path) {
        blockComments.push(path.value);
        this.traverse(path);
      }
    });

    assert.strictEqual(blockComments.length, 1);
    assert.strictEqual(blockComments[0].value, "arguments");

    assert.strictEqual(lineComments.length, 0);

    blockComments.length = 0;
    lineComments.length = 0;

    visit(ast, {
      visitLine: function(path) {
        lineComments.push(path.value);
        this.traverse(path);
      }
    });

    assert.strictEqual(blockComments.length, 0);

    assert.strictEqual(lineComments.length, 1);
    assert.strictEqual(
      lineComments[0].value,
      " Turn arguments into an array."
    );

    blockComments.length = 0;
    lineComments.length = 0;

    visit(ast, {
      visitBlock: function(path) {
        blockComments.push(path.value);
        this.traverse(path);
      },

      visitLine: function(path) {
        lineComments.push(path.value);
        this.traverse(path);
      }
    });

    assert.strictEqual(blockComments.length, 1);
    assert.strictEqual(blockComments[0].value, "arguments");

    assert.strictEqual(lineComments.length, 1);
    assert.strictEqual(
      lineComments[0].value,
      " Turn arguments into an array."
    );
  });
});

describe("path traversal", function() {
  var call = b.expressionStatement(
    b.callExpression(
      b.memberExpression(
        b.identifier("foo"),
        b.identifier("bar"),
        false
      ),
      [b.literal("baz")]
    )
  );

  it("should accept root paths as well as AST nodes", function() {
    var path = new NodePath(call).get("expression", "callee");
    var idCount = 0;

    // Note that we're passing a path instead of a node as the first
    // argument to types.traverse.
    visit(path, {
      visitIdentifier: function(path) {
        var node = path.node;
        ++idCount;

        if (node.name === "bar") {
          n.MemberExpression.assert(path.parent.node);
          n.CallExpression.assert(path.parent.parent.node);
          n.ExpressionStatement.assert(path.parent.parent.parent.node);
        }

        this.traverse(path);
      }
    });

    assert.strictEqual(idCount, 2);
  });
});

describe("replacing the root", function() {
  var ast = b.expressionStatement(
    b.unaryExpression("!", b.sequenceExpression([
      b.identifier("a"),
      b.identifier("b"),
      b.identifier("c")
    ]))
  );

  it("should be possible", function() {
    var callExp = visit(ast, {
      visitExpressionStatement: function(path) {
        path.replace(b.callExpression(b.identifier("f"), [
          path.node.expression
        ]));

        this.traverse(path);
      }
    });

    n.CallExpression.assert(callExp, true);
  });
});

describe("NodePath", function() {
  it("should have the expected type hierarchy", function() {
    assert.strictEqual(new Path({}).constructor, Path);

    var np = new NodePath(b.identifier("foo"));
    assert.strictEqual(np.constructor, NodePath);
    assert.ok(np.get("name") instanceof NodePath);
  });

  var ast = b.expressionStatement(
    b.unaryExpression("!", b.sequenceExpression([
      b.identifier("a"),
      b.identifier("b"),
      b.identifier("c")
    ]))
  );

  var path = new NodePath(ast);

  it("should have sane values, nodes, parents", function() {
    var opPath = path.get("expression", "operator");
    assert.strictEqual(opPath.value, "!");
    assert.strictEqual(opPath.node, ast.expression);
    assert.strictEqual(opPath.parent, path);
    assert.strictEqual(opPath.parent.node, ast);
  });

  var binaryYield = b.expressionStatement(
    b.logicalExpression(
      "&&",
      b.yieldExpression(b.identifier("a"), false),
      b.yieldExpression(b.identifier("b"), true)
    )
  );

  it("should support .needsParens()", function() {
    var argPath = path.get("expression", "argument");
    assert.ok(argPath.needsParens());

    var exprsPath = argPath.get("expressions");
    assert.ok(!exprsPath.needsParens());
    assert.strictEqual(exprsPath.get("length").value, 3);
    assert.ok(!exprsPath.get(1).needsParens());

    var byPath = new NodePath(binaryYield);
    assert.ok(!byPath.get("expression").needsParens());
    assert.ok(byPath.get("expression", "left").needsParens());
    assert.ok(byPath.get("expression", "right").needsParens());

    var sequenceAssignmentAST = b.assignmentExpression(
      '=',
      b.identifier('a'),
      b.sequenceExpression([b.literal(1), b.literal(2)])
    );

    var sequenceAssignmentPath = new NodePath(sequenceAssignmentAST);
    assert.ok(sequenceAssignmentPath.get("right").needsParens());
  });

  it("should support .needsParens(true)", function() {
    var programPath = new NodePath(parse("(function(){})"));
    var funExpPath = programPath.get("body", 0, "expression");
    n.FunctionExpression.assert(funExpPath.value);
    assert.strictEqual(funExpPath.needsParens(), true);
    assert.strictEqual(funExpPath.canBeFirstInStatement(), false);
    assert.strictEqual(funExpPath.firstInStatement(), true);
    assert.strictEqual(funExpPath.needsParens(true), false);

    programPath = new NodePath(parse("({ foo: 42 })"));
    var objLitPath = programPath.get("body", 0, "expression");
    n.ObjectExpression.assert(objLitPath.value);
    assert.strictEqual(objLitPath.needsParens(), true);
    assert.strictEqual(objLitPath.canBeFirstInStatement(), false);
    assert.strictEqual(objLitPath.firstInStatement(), true);
    assert.strictEqual(objLitPath.needsParens(true), false);
  });

  it("should prune redundant variable declaration nodes", function() {
    var programPath = new NodePath(parse("(function(){var y = 1,x = 2;})"));
    var funBlockStatementPath = programPath.get("body", 0, "expression", "body");
    var variableDeclaration = funBlockStatementPath.get("body", 0);
    var yVariableDeclaratorPath = variableDeclaration.get("declarations", 0);
    var xVariableDeclaratorPath = variableDeclaration.get("declarations", 1);

    n.VariableDeclarator.assert(yVariableDeclaratorPath.node);
    n.VariableDeclarator.assert(xVariableDeclaratorPath.node);

    var remainingNodePath = yVariableDeclaratorPath.prune();

    assert.strictEqual(remainingNodePath, variableDeclaration);

    remainingNodePath = xVariableDeclaratorPath.prune();

    assert.strictEqual(remainingNodePath, funBlockStatementPath);
    assert.strictEqual(funBlockStatementPath.get("body", 0).value, undefined);
  });

  it("should prune redundant expression statement nodes", function() {
    var programPath = new NodePath(parse("(function(){key = 'value';})"));
    var funBlockStatementPath = programPath.get("body", 0, "expression", "body");
    var assignmentExpressionPath = funBlockStatementPath.get("body", 0, "expression");

    n.AssignmentExpression.assert(assignmentExpressionPath.node);

    var remainingNodePath = assignmentExpressionPath.prune();

    assert.strictEqual(remainingNodePath, funBlockStatementPath);
    assert.strictEqual(funBlockStatementPath.value.body.length, 0);
  });

  it("should prune redundant if statement node if no consequent and alternate remain after prune", function() {
    var programPath = new NodePath(parse("if(true){var t = 0;}"));
    var consequentNodePath = programPath.get("body", 0, "consequent");

    n.BlockStatement.assert(consequentNodePath.node);

    var remainingNodePath = consequentNodePath.prune();

    var testExpressionNodePath = programPath.get("body", 0);

    n.ExpressionStatement.assert(remainingNodePath.node);
    assert.strictEqual(remainingNodePath, testExpressionNodePath);
  });

  it("should modify if statement node if consequent is pruned and alternate remains", function() {
    var programPath = new NodePath(parse("if(x > 10){var t = 0;}else{var f = 2;}"));
    var consequentNodePath = programPath.get("body", 0, "consequent");

    n.BlockStatement.assert(consequentNodePath.node);

    var remainingNodePath = consequentNodePath.prune();

    var modifiedIfStatementNodePath = programPath.get("body", 0);
    var negatedTestExpression = modifiedIfStatementNodePath.get("test");

    n.IfStatement.assert(remainingNodePath.node);
    n.UnaryExpression.assert(negatedTestExpression.node);
    assert.strictEqual(remainingNodePath, modifiedIfStatementNodePath);
    assert.strictEqual(negatedTestExpression.node.operator, "!");
  });

  it("should modify if statement node if consequent is pruned, alternate remains with no double negation", function() {
    var programPath = new NodePath(parse("if(!condition){var t = 0;}else{var f = 2;}"));
    var consequentNodePath = programPath.get("body", 0, "consequent");

    n.BlockStatement.assert(consequentNodePath.node);

    var remainingNodePath = consequentNodePath.prune();

    var modifiedIfStatementNodePath = programPath.get("body", 0);
    var testExpression = modifiedIfStatementNodePath.get("test");

    n.IfStatement.assert(remainingNodePath.node);
    n.Identifier.assert(testExpression.node);
    assert.strictEqual(remainingNodePath, modifiedIfStatementNodePath);
  });
});

describe("path.replace", function() {
  var ast: any;

  beforeEach(function() {
    ast = b.functionDeclaration(
      b.identifier("fn"),
      [],
      b.blockStatement([
        b.variableDeclaration(
          "var",
          [b.variableDeclarator(b.identifier("a"), null)]
        )
      ])
    );
  });

  it("should support replacement with a single node", function() {
    visit(ast, {
      visitIdentifier: function(path) {
        if (path.node.name === "a") {
          path.replace(b.identifier("b"));
        }
        this.traverse(path);
      }
    });

    assert.equal(ast.body.body[0].declarations[0].id.name, "b");
  });

  it("should support replacement in an array with a single node", function() {
    visit(ast, {
      visitVariableDeclaration: function(path) {
        path.replace(b.returnStatement(null));
        this.traverse(path);
      }
    });

    assert.equal(ast.body.body.length, 1);
    assert.ok(n.ReturnStatement.check(ast.body.body[0]));
  });

  it("should support replacement with nothing", function() {
    visit(ast, {
      visitVariableDeclaration: function(path) {
        path.replace();
        this.traverse(path);
      }
    });

    assert.equal(ast.body.body.length, 0);
  });

  it("should support replacement with itself plus more in an array", function() {
    visit(ast, {
      visitVariableDeclaration: function(path) {
        var scopeBody = path.scope.path.get("body", "body");

        // This is contrived such that we just happen to be replacing
        // the same node we're currently processing, perhaps using a
        // helper function to create variables at the top of the scope.
        assert.strictEqual(scopeBody.get(0), path);

        // Prepend `var $$;` inside the block. This should update our
        // `this` NodePath to correct its array index so that a
        // subsequent replace will still work.
        scopeBody.get(0).replace(
          b.variableDeclaration(
            "var",
            [b.variableDeclarator(b.identifier("$$"), null)]
          ),
          scopeBody.get(0).value
        );

        // Now do it again to make sure all the other indexes are
        // updated, too.
        scopeBody.get(0).replace(
          b.variableDeclaration(
            "var",
            [b.variableDeclarator(b.identifier("$2"), null)]
          ),
          scopeBody.get(0).value
        );

        assert.strictEqual(scopeBody.get(0), path);

        // Then replace the node, not the one we just added.
        return b.returnStatement(b.identifier("$3"));
      }
    });

    var statements = ast.body.body;
    assert.deepEqual(
      statements.map(function(node: any) { return node.type; }),
      ['ReturnStatement', 'VariableDeclaration', 'VariableDeclaration']
    );

    n.ReturnStatement.assert(statements[0]);
    assert.equal(statements[0].argument.name, "$3");

    n.VariableDeclaration.assert(statements[1]);
    assert.equal(statements[1].declarations[0].id.name, "$$");

    n.VariableDeclaration.assert(statements[2]);
    assert.equal(statements[2].declarations[0].id.name, "a");
  });

  it("should not throw when replacing the same node twice", function() {
    visit(ast, {
      visitVariableDeclaration: function(path) {
        path.replace(b.expressionStatement(b.literal(null)));
        n.ExpressionStatement.assert(path.value);
        n.Literal.assert(path.value.expression);
        assert.strictEqual(path.value.expression.value, null);

        path.replace(b.expressionStatement(b.literal("OK")));
        n.ExpressionStatement.assert(path.value);
        n.Literal.assert(path.value.expression);
        assert.strictEqual(path.value.expression.value, "OK");

        if (path.parentPath.get(path.name) !== path) {
          assert.ok(false, "Should have reused the same path");
        }

        this.traverse(path);
      }
    });
  });
});

describe("global scope", function() {
  var scope = [
    "var foo = 42;",
    "function bar(baz) {",
    "  return baz + foo;",
    "}"
  ];

  var ast = parse(scope.join("\n"));

  it("should be reachable from nested scopes", function() {
    var globalScope: any;

    visit(ast, {
      visitProgram: function(path) {
        assert.strictEqual(path.scope.isGlobal, true);
        globalScope = path.scope;
        this.traverse(path);
      },

      visitFunctionDeclaration: function(path) {
        var node = path.node;
        assert.strictEqual(path.scope.isGlobal, false);

        const name = node.id ? node.id.name : null;
        assert.strictEqual(name, "bar");
        assert.notStrictEqual(path.scope, globalScope);
        assert.strictEqual(path.scope.isGlobal, false);
        assert.strictEqual(path.scope.parent, globalScope);

        assert.strictEqual(path.scope.getGlobalScope(), globalScope);

        this.traverse(path);
      }
    });
  });

  it("should be found by .lookup and .declares", function() {
    var globalScope: any;

    visit(ast, {
      visitProgram: function(path) {
        assert.strictEqual(path.scope.isGlobal, true);
        globalScope = path.scope;
        this.traverse(path);
      },

      visitFunctionDeclaration: function(path) {
        assert.ok(globalScope.declares("foo"));
        assert.ok(globalScope.declares("bar"));
        assert.strictEqual(path.scope.lookup("foo"), globalScope);
        assert.strictEqual(path.scope.lookup("bar"), globalScope);

        assert.ok(path.scope.declares("baz"));
        assert.strictEqual(path.scope.lookup("baz"), path.scope);

        assert.strictEqual(path.scope.lookup("qux"), null);
        assert.strictEqual(globalScope.lookup("baz"), null);

        this.traverse(path);
      }
    });
  });
});

describe("scope methods", function () {
  var scope = [
    "var foo = 42;",
    "function bar(baz) {",
    "  return baz + foo;",
    "}",
    "var nom = function rom(pom) {",
    "  var zom;",
    "  return rom(pom);",
    "};"
  ];

  it("getBindings should get local and global scope bindings", function() {
    var ast = parse(scope.join("\n"));
    var checked: any[] = [];

    visit(ast, {
      visitProgram: function(path) {
        var bindings = path.scope.getBindings();
        assert.deepEqual(["bar", "foo", "nom"], Object.keys(bindings).sort());
        assert.equal(1, bindings.foo.length);
        assert.equal(1, bindings.bar.length);
        checked.push(path.node);
        this.traverse(path);
      },

      visitFunctionDeclaration: function(path) {
        var bindings = path.scope.getBindings();
        assert.deepEqual(["baz"], Object.keys(bindings));
        assert.equal(1, bindings.baz.length);
        checked.push(path.node);
        this.traverse(path);
      },

      visitReturnStatement: function(path) {
        var node = path.node;
        if (n.CallExpression.check(node.argument) &&
            n.Identifier.check(node.argument.callee) &&
            node.argument.callee.name === "rom") {
          var bindings = path.scope.getBindings();
          assert.deepEqual(["pom", "rom", "zom"], Object.keys(bindings).sort());
          checked.push(node);
        }
        this.traverse(path);
      }
    });

    assert.deepEqual(
      checked.map(function(node) { return node.type; }),
      ['Program', 'FunctionDeclaration', 'ReturnStatement']
    );
  });

  it("getBindings should work for import statements (esprima-fb)", function() {
    var ast = esprimaFb.parse(
      [
        "import {x, y as z} from 'xy';",
        "import xyDefault from 'xy';",
        "import * as xyNamespace from 'xy';"
      ].join("\n"),
      {sourceType: "module"}
    );

    var names;

    visit(ast, {
      visitProgram: function(path) {
        names = Object.keys(path.scope.getBindings()).sort();
        this.traverse(path);
      }
    });

    assert.deepEqual(names, ["x", "xyDefault", "xyNamespace", "z"]);
  });

  it("getBindings should work for import statements (acorn)", function() {
    var ast = babylonParse([
      "import {x, y as z} from 'xy';",
      "import xyDefault from 'xy';",
      "import * as xyNamespace from 'xy';"
    ].join("\n"), {
      sourceType: "module",
      ecmaVersion: 6
    });

    var names;

    visit(ast, {
      visitProgram: function(path) {
        names = Object.keys(path.scope.getBindings()).sort();
        this.traverse(path);
      }
    });

    assert.deepEqual(names, ["x", "xyDefault", "xyNamespace", "z"]);
  });

  describe("getBindings should work with destructuring operations", function() {
    const code = `
function aFunction(arg1, { arg2 }) {
  const { arg3, nested: { something: arg4 } } = arg1;
  const [arg5] = arg1;
  return 0;
}`;
    for (const { parser, parserName } of [
      { parser: parse, parserName: "esprima" },
      { parser: babylonParse, parserName: "babel" }
    ]) {
      it(`produces the correct bindings with ${parserName} parser`, function() {
        const ast = parser(code);

        visit(ast, {
          visitReturnStatement: function(path) {
            const names = Object.keys(path.scope.getBindings()).sort();
            assert.deepEqual(names, ["arg1", "arg2", "arg3", "arg4", "arg5"]);
            return false;
          }
        })
      });
    }
  });

  (nodeMajorVersion >= 6 ? it : xit)
  ("should work for ES6 syntax (espree)", function() {
    var names;

    var ast = espree.parse([
      "var zap;",
      "export default function(zom) {",
      "    var innerFn = function(zip) {};",
      "    return innerFn(zom);",
      "};"
    ].join("\n"), {
      sourceType: "module",
      ecmaVersion: 2020,
    });

    visit(ast, {
      visitFunctionDeclaration: function(path) {
        names = Object.keys(path.scope.lookup("zap").getBindings()).sort();
        assert.deepEqual(names, ["zap"]);
        this.traverse(path);
      }
    });
  });

(nodeMajorVersion >= 6 ? it : xit)
  ("should work with classes for ES6 syntax (espree)", function() {
    var names;

    var ast = espree.parse([
      "var zap;",
      "export default class {",
      "    render () {",
      "        var innerFn = function(zip) {};",
      "        return innerFn(zom);",
      "    }",
      "};"
    ].join("\n"), {
      sourceType: "module",
      ecmaVersion: 2020,
    });

    visit(ast, {
      visitCallExpression: function(path) {
        names = Object.keys(path.scope.lookup("zap").getBindings()).sort();
        assert.deepEqual(names, ["zap"]);
        this.traverse(path);
      }
    });
  });

  it("should inject temporary into current scope", function() {
    var ast = parse(scope.join("\n"));
    var bindings;

    visit(ast, {
      visitProgram: function(path) {
        path.scope.injectTemporary();
        bindings = path.scope.getBindings();
        assert.deepEqual(["bar", "foo", "nom", "t$0$0"], Object.keys(bindings).sort());
        this.traverse(path);
      },

      visitFunctionDeclaration: function(path) {
        path.scope.injectTemporary(
          path.scope.declareTemporary("t$")
        )
        bindings = path.scope.getBindings();
        assert.deepEqual(["baz", "t$1$0"], Object.keys(bindings));
        this.traverse(path);
      }
    });
  });

  it("declareTemporary should use distinct names in nested scopes", function() {
    var ast = parse(scope.join("\n"));
    var globalVarDecl: any;
    var barVarDecl: any;
    var romVarDecl: any;

    visit(ast, {
      visitProgram: function(path) {
        path.get("body").unshift(
          globalVarDecl = b.variableDeclaration("var", [
            b.variableDeclarator(
              path.scope.declareTemporary("$"),
              b.literal("global")
            ),
            b.variableDeclarator(
              path.scope.declareTemporary("$"),
              b.literal("global")
            )
          ])
        );

        this.traverse(path);
      },

      visitFunction: function(path) {
        var funcId = path.value.id;

        var varDecl = b.variableDeclaration("var", [
          b.variableDeclarator(
            path.scope.declareTemporary("$"),
            b.literal(funcId.name + 1)
          ),
          b.variableDeclarator(
            path.scope.declareTemporary("$"),
            b.literal(funcId.name + 2)
          )
        ]);

        path.get("body", "body").unshift(varDecl);

        if (funcId.name === "bar") {
          barVarDecl = varDecl;
        } else if (funcId.name === "rom") {
          romVarDecl = varDecl;
        }

        this.traverse(path);
      }
    });

    assert.strictEqual(globalVarDecl.declarations[0].id.name, "$0$0");
    assert.strictEqual(globalVarDecl.declarations[1].id.name, "$0$1");
    assert.strictEqual(barVarDecl.declarations[0].id.name, "$1$0");
    assert.strictEqual(barVarDecl.declarations[1].id.name, "$1$1");
    assert.strictEqual(romVarDecl.declarations[0].id.name, "$1$0");
    assert.strictEqual(romVarDecl.declarations[1].id.name, "$1$1");
  });
});

describe("catch block scope", function() {
  var catchWithVarDecl = [
    "function foo(e) {",
    "  try {",
    "    bar();",
    "  } catch (e) {",
    "    var f = e + 1;",
    "    return function(g) {",
    "      return e + g;",
    "    };",
    "  }",
    "  return f;",
    "}"
  ];

  var path = new NodePath(parse(catchWithVarDecl.join("\n")));
  var fooPath = path.get("body", 0);
  var fooScope = fooPath.scope;
  var catchPath = fooPath.get("body", "body", 0, "handler");
  var catchScope = catchPath.scope;

  it("should not affect outer scope declarations", function() {
    n.FunctionDeclaration.assert(fooScope.node);
    assert.strictEqual(fooScope.declares("e"), true);
    assert.strictEqual(fooScope.declares("f"), true);
    assert.strictEqual(fooScope.lookup("e"), fooScope);
  });

  it("should declare only the guard parameter", function() {
    n.CatchClause.assert(catchScope.node);
    assert.strictEqual(catchScope.declares("e"), true);
    assert.strictEqual(catchScope.declares("f"), false);
    assert.strictEqual(catchScope.lookup("e"), catchScope);
    assert.strictEqual(catchScope.lookup("f"), fooScope);
  });

  it("should shadow only the parameter in nested scopes", function() {
    var closurePath = catchPath.get("body", "body", 1, "argument");
    var closureScope = closurePath.scope;
    n.FunctionExpression.assert(closureScope.node);
    assert.strictEqual(closureScope.declares("e"), false);
    assert.strictEqual(closureScope.declares("f"), false);
    assert.strictEqual(closureScope.declares("g"), true);
    assert.strictEqual(closureScope.lookup("g"), closureScope);
    assert.strictEqual(closureScope.lookup("e"), catchScope);
    assert.strictEqual(closureScope.lookup("f"), fooScope);
  });
});

describe("array and object pattern scope", function() {

  function scopeFromPattern(pattern: any) {
    return new NodePath(
      b.program([
        b.variableDeclaration('var', [
          b.variableDeclarator(pattern, null)
        ])
      ])
    ).scope;
  }

  // ObjectPattern with Property and SpreadProperty
  // ArrayPattern with SpreadElement
  describe("esprima", function() {
    var types = fork([
      esprimaDef
    ]);
    var b = types.builders;

    var objectPattern: any;
    var arrayPattern: any;

    beforeEach(function() {
      // {a, b: c, ...d}
      objectPattern = b.objectPattern([
        b.property('init', b.identifier('a'), b.identifier('a')),
        b.property('init', b.identifier('b'), b.identifier('c')),
        b.spreadProperty(b.identifier('d')),
      ]);

      // [foo, bar, ...baz]
      arrayPattern = b.arrayPattern([
        b.identifier('foo'),
        b.identifier('bar'),
        b.spreadElement(b.identifier('baz'))
      ]);
    });

    it("should handle object patterns variable declarations", function() {
      var scope = scopeFromPattern(objectPattern);

      assert.strictEqual(scope.declares("a"), true);
      assert.strictEqual(scope.declares("b"), false);
      assert.strictEqual(scope.declares("c"), true);
      assert.strictEqual(scope.declares("d"), true);
    });

    it("should handle array patterns in variable declarations", function() {
      var scope = scopeFromPattern(arrayPattern);

      assert.strictEqual(scope.declares("foo"), true);
      assert.strictEqual(scope.declares("bar"), true);
      assert.strictEqual(scope.declares("baz"), true);
    });

    it("should handle nested patterns in variable declarations", function() {
      // {a, b: c, ...d, e: [foo, bar, ...baz]}
      objectPattern.properties.push(
        b.property('init', b.identifier('e'), arrayPattern)
      );

      var scope = scopeFromPattern(objectPattern);
      assert.strictEqual(scope.declares("a"), true);
      assert.strictEqual(scope.declares("b"), false);
      assert.strictEqual(scope.declares("c"), true);
      assert.strictEqual(scope.declares("d"), true);
      assert.strictEqual(scope.declares("e"), false);
      assert.strictEqual(scope.declares("foo"), true);
      assert.strictEqual(scope.declares("bar"), true);
      assert.strictEqual(scope.declares("baz"), true);
    });
  });

  // ObjectPattern with PropertyPattern and SpreadPropertyPattern
  // ArrayPatterhn with SpreadElementPattern
  describe("Mozilla Parser API", function() {
    var types = fork([
      coreDef,
      es6Def,
      esProposalsDef,
    ]);
    var b = types.builders;

    var objectPattern: any;
    var arrayPattern: any;

    beforeEach(function() {
      // {a, b: c, ...d}
      objectPattern = b.objectPattern([
        b.propertyPattern(b.identifier('a'), b.identifier('a')),
        b.propertyPattern(b.identifier('b'), b.identifier('c')),
        b.spreadPropertyPattern(b.identifier('d')),
      ]);

      // [foo, bar, ...baz]
      arrayPattern = b.arrayPattern([
        b.identifier('foo'),
        b.identifier('bar'),
        b.spreadElementPattern(b.identifier('baz'))
      ]);
    });

    it("should handle object patterns variable declarations", function() {
      var scope = scopeFromPattern(objectPattern);

      assert.strictEqual(scope.declares("a"), true);
      assert.strictEqual(scope.declares("b"), false);
      assert.strictEqual(scope.declares("c"), true);
      assert.strictEqual(scope.declares("d"), true);
    });

    it("should handle array patterns in variable declarations", function() {
      var scope = scopeFromPattern(arrayPattern);

      assert.strictEqual(scope.declares("foo"), true);
      assert.strictEqual(scope.declares("bar"), true);
      assert.strictEqual(scope.declares("baz"), true);
    });

    it("should handle nested patterns in variable declarations", function() {
      // {a, b: c, ...d, e: [foo, bar, ...baz]}
      objectPattern.properties.push(
        b.propertyPattern(b.identifier('e'), arrayPattern)
      );

      var scope = scopeFromPattern(objectPattern);
      assert.strictEqual(scope.declares("a"), true);
      assert.strictEqual(scope.declares("b"), false);
      assert.strictEqual(scope.declares("c"), true);
      assert.strictEqual(scope.declares("d"), true);
      assert.strictEqual(scope.declares("e"), false);
      assert.strictEqual(scope.declares("foo"), true);
      assert.strictEqual(scope.declares("bar"), true);
      assert.strictEqual(scope.declares("baz"), true);
    });
  });
});

describe("types.defineMethod", function() {
  function at(this: any, loc: any) {
    n.SourceLocation.assert(loc);
    this.loc = loc;
  }

  var thisExpr: any = b.thisExpression();

  it("should allow defining an .at method", function() {
    assert.strictEqual(defineMethod("at", at), void 0);
    assert.strictEqual(thisExpr.loc, null);

    thisExpr.at({
      start: {
        line: 1,
        column: 0,
      },
      end: {
        line: 1,
        column: 4,
      }
    });

    assert.strictEqual(thisExpr.loc.start.line, 1);
    assert.strictEqual(thisExpr.loc.start.column, 0);
    assert.strictEqual(thisExpr.loc.end.line, 1);
    assert.strictEqual(thisExpr.loc.end.column, 4);
  });

  it("should allow methods to be removed", function() {
    // Now try removing the method.
    assert.strictEqual(defineMethod("at"), at);
    assert.strictEqual(thisExpr.at, void 0);
    assert.strictEqual("at" in thisExpr, false);
  });
});

describe("types.visit", function() {
  var objProp: any;

  beforeEach(function() {
    objProp = b.memberExpression(
      b.identifier("object"),
      b.identifier("property"),
      false
    );
  });

  it("should be identical to PathVisitor.visit", function() {
    assert.strictEqual(visit, PathVisitor.visit);
  });

  it("should work with no visitors", function() {
    var foo = b.identifier("foo");
    assert.strictEqual(visit(foo), foo);
  });

  it("should allow simple tree modifications", function() {
    var bar = visit(b.identifier("foo"), {
      visitIdentifier: function(path) {
        assert.ok(path instanceof NodePath);
        path.value.name = "bar";
        return false;
      }
    });

    n.Identifier.assert(bar);
    assert.strictEqual(bar.name, "bar");
  });

  it("should complain about missing this.traverse", function() {
    try {
      visit(objProp, {
        visitIdentifier: function(_path: any) {
          // buh?
        }
      });

      assert.ok(false, "should have thrown an exception");

    } catch (err: any) {
      assert.strictEqual(
        err.message,
        "Must either call this.traverse or return false in visitIdentifier"
      );
    }
  });

  it("should support this.traverse", function() {
    var idNames: any[] = [];

    visit(objProp, {
      visitMemberExpression: function(path) {
        this.traverse(path, {
          visitIdentifier: function(path) {
            idNames.push("*" + path.value.name + "*");
            return false;
          }
        });

        path.get("object", "name").replace("asdfasdf");
        path.get("property", "name").replace("zxcvzxcv");

        this.visit(path.get("property"));
      },

      visitIdentifier: function(path) {
        idNames.push(path.value.name);
        return false;
      }
    });

    assert.deepEqual(idNames, ["*object*", "*property*", "zxcvzxcv"]);

    idNames.length = 0;

    visit(objProp, {
      visitMemberExpression: function(path) {
        path.get("object", "name").replace("asdfasdf");
        path.get("property", "name").replace("zxcvzxcv");
        this.traverse(path, {
          visitIdentifier: function(path) {
            idNames.push(path.value.name);
            return false;
          }
        });
      }
    });

    assert.deepEqual(idNames, ["asdfasdf", "zxcvzxcv"]);
  });

  it("should support this.replace", function() {
    var seqExpr = b.sequenceExpression([
      b.literal("asdf"),
      b.identifier("zxcv"),
      b.thisExpression()
    ]);

    visit(seqExpr, {
      visitIdentifier: function(path) {
        assert.strictEqual(path.value.name, "zxcv");
        path.replace(
          b.identifier("foo"),
          b.identifier("bar")
        );
        return false;
      }
    });

    assert.strictEqual(seqExpr.expressions.length, 4);

    var foo: any = seqExpr.expressions[1];
    n.Identifier.assert(foo);
    assert.strictEqual(foo.name, "foo");

    var bar: any = seqExpr.expressions[2];
    n.Identifier.assert(bar);
    assert.strictEqual(bar.name, "bar");

    visit(seqExpr, {
      visitIdentifier: function(path) {
        if (path.value.name === "foo") {
          path.replace(path.value, path.value);
        }

        return false;
      }
    });

    assert.strictEqual(seqExpr.expressions.length, 5);

    var foo: any = seqExpr.expressions[1];
    n.Identifier.assert(foo);
    assert.strictEqual(foo.name, "foo");

    var foo: any = seqExpr.expressions[2];
    n.Identifier.assert(foo);
    assert.strictEqual(foo.name, "foo");

    var bar: any = seqExpr.expressions[3];
    n.Identifier.assert(bar);
    assert.strictEqual(bar.name, "bar");

    visit(seqExpr, {
      visitLiteral: function(path) {
        path.replace();
        return false;
      },

      visitIdentifier: function(path) {
        if (path.value.name === "bar") {
          path.replace();
        }

        return false;
      }
    });

    assert.strictEqual(seqExpr.expressions.length, 3);

    var first: any = seqExpr.expressions[0];
    n.Identifier.assert(first);
    assert.strictEqual(first.name, "foo");

    var second = seqExpr.expressions[1];
    assert.strictEqual(second, first);

    var third = seqExpr.expressions[2];
    n.ThisExpression.assert(third);
  });

  it("should reuse old VisitorContext objects", function() {
    var objectContext;
    var propertyContext;

    visit(objProp, {
      visitIdentifier: function(path) {
        assert.strictEqual(this.needToCallTraverse, true);
        this.traverse(path);
        assert.strictEqual(path.name, path.value.name);
        if (path.name === "object") {
          objectContext = this;
        } else if (path.name === "property") {
          propertyContext = this;
        }
      }
    });

    assert.ok(objectContext);
    assert.ok(propertyContext);
    assert.strictEqual(objectContext, propertyContext);
  });

  it("should dispatch to closest visitSupertype method", function() {
    var foo = b.identifier("foo");
    var bar = b.identifier("bar");
    var callExpr: any = b.callExpression(
      b.memberExpression(
        b.functionExpression(
          b.identifier("add"),
          [foo, bar],
          b.blockStatement([
            b.returnStatement(
              b.binaryExpression("+", foo, bar)
            )
          ])
        ),
        b.identifier("bind"),
        false
      ),
      [b.thisExpression()]
    );

    var nodes: any[] = [];
    var expressions: any[] = [];
    var identifiers: any[] = [];
    var statements: any[] = [];
    var returnStatements: any[] = [];
    var functions: any[] = [];

    function makeVisitorMethod(array: any) {
      return function(this: any, path: any) {
        array.push(path.value);
        this.traverse(path);
      };
    }

    visit(callExpr, {
      visitNode:            makeVisitorMethod(nodes),
      visitExpression:      makeVisitorMethod(expressions),
      visitIdentifier:      makeVisitorMethod(identifiers),
      visitStatement:       makeVisitorMethod(statements),
      visitReturnStatement: makeVisitorMethod(returnStatements),
      visitFunction:        makeVisitorMethod(functions)
    });

    function check(array: any, ...rest: any[]) {
      assert.strictEqual(array.length, rest.length);
      for (var i = 0; i < rest.length; ++i) {
        assert.strictEqual(array[i], rest[i]);
      }
    }

    check(nodes);

    check(expressions,
          callExpr,
          callExpr.callee,
          callExpr.callee.object.body.body[0].argument,
          callExpr.arguments[0]);

    check(identifiers,
          callExpr.callee.object.id,
          foo,
          bar,
          foo,
          bar,
          callExpr.callee.property);

    check(statements,
          callExpr.callee.object.body);

    check(returnStatements,
          callExpr.callee.object.body.body[0]);

    check(functions,
          callExpr.callee.object);
  });

  it("should replace this.currentPath with returned value", function() {
    assert.strictEqual(objProp.computed, false);

    visit(objProp, {
      visitIdentifier: function(path) {
        if (path.value.name === "property") {
          path.parent.get("computed").replace(true);
          return b.callExpression(
            b.memberExpression(
              b.thisExpression(),
              b.identifier("toString"),
              false
            ),
            []
          );
        }

        this.traverse(path);
        return;
      },

      visitThisExpression: function(_path: any) {
        return b.identifier("self");
      }
    });

    assert.strictEqual(objProp.computed, true);
    n.CallExpression.assert(objProp.property);

    var callee = objProp.property.callee;
    n.MemberExpression.assert(callee);

    n.Identifier.assert(callee.object);
    assert.strictEqual(callee.object.name, "self");

    n.Identifier.assert(callee.property);
    assert.strictEqual(callee.property.name, "toString");

    assert.deepEqual(objProp.property.arguments, []);
  });
});

describe("path.shift", function() {
  it("should work like Array.prototype.shift", function() {
    var path = new NodePath({
      elements: [0, "foo", true]
    });

    var first = path.get("elements", 0);
    assert.strictEqual(first.name, 0);

    var second = path.get("elements", 1);
    assert.strictEqual(second.name, 1);

    var third = path.get("elements", 2);
    assert.strictEqual(third.name, 2);

    assert.strictEqual(path.get("elements", "length").value, 3);

    assert.strictEqual(path.get("elements").shift(), first.value);
    assert.strictEqual(path.get("elements", "length").value, 2);
    assert.strictEqual(path.get("elements", 0), second);
    assert.strictEqual(path.get("elements", 1), third);
    assert.strictEqual(second.name, 0);
    assert.strictEqual(third.name, 1);

    assert.strictEqual(path.get("elements").shift(), second.value);
    assert.strictEqual(path.get("elements", "length").value, 1);
    assert.strictEqual(path.get("elements", 0), third);
    assert.strictEqual(third.name, 0);

    assert.strictEqual(path.get("elements").shift(), third.value);
    assert.strictEqual(path.get("elements").shift(), void 0);
    assert.strictEqual(path.get("elements", "length").value, 0);
  });

  it("should throw when path.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").shift();
    });
  });
});

describe("path.unshift", function() {
  it("should work like Array.prototype.unshift", function() {
    var path = new NodePath(b.sequenceExpression([]));
    var elems = path.get("expressions");

    var one = b.literal(1);
    var two = b.literal(2);
    var three = b.literal(3);
    var four = b.literal(4);
    var five = b.literal(5);

    assert.strictEqual(elems.get(1).parentPath, elems);
    assert.strictEqual(elems.get(1).node, path.value);
    assert.strictEqual(elems.get(1).parent, null);

    assert.strictEqual(elems.get("length").value, 0);
    elems.unshift(three, four, five);
    assert.deepEqual(path.value.expressions, [three, four, five]);
    var fourPath = elems.get(1);
    assert.strictEqual(fourPath.value.value, 4);
    elems.unshift(one, two);
    assert.deepEqual(elems.value, [one, two, three, four, five]);
    elems.unshift();
    assert.deepEqual(elems.value, [one, two, three, four, five]);
    assert.strictEqual(fourPath.name, 3);
    assert.strictEqual(elems.get("length").value, 5);

    assert.strictEqual(elems.get(1).parentPath, elems);
    assert.strictEqual(elems.get(1).node, two);
    assert.strictEqual(elems.get(1).parent, path);
  });

  it("should throw when path.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").unshift();
    });
  });
});

describe("path.push", function() {
  it("should work like Array.prototype.push", function() {
    var path = new NodePath({ elements: [0] });
    var elems = path.get("elements");
    assert.strictEqual(elems.get("length").value, 1);
    elems.push(1, 2, 3);
    assert.deepEqual(path.value.elements, [0, 1, 2, 3]);
    var two = elems.get(2);
    assert.strictEqual(two.value, 2);
    elems.push(4, 5);
    assert.deepEqual(elems.value, [0, 1, 2, 3, 4, 5]);
    elems.push();
    assert.deepEqual(elems.value, [0, 1, 2, 3, 4, 5]);
    assert.strictEqual(two.name, 2);
    assert.strictEqual(elems.get("length").value, 6);
  });

  it("should throw when path.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").push("asdf");
    });
  });
});

describe("path.pop", function() {
  it("should work like Array.prototype.pop", function() {
    var path = new NodePath({
      elements: [0, "foo", true]
    });

    var first = path.get("elements", 0);
    assert.strictEqual(first.name, 0);

    var second = path.get("elements", 1);
    assert.strictEqual(second.name, 1);

    var third = path.get("elements", 2);
    assert.strictEqual(third.name, 2);

    assert.strictEqual(path.get("elements", "length").value, 3);

    assert.strictEqual(path.get("elements").pop(), third.value);
    assert.strictEqual(path.get("elements", "length").value, 2);
    assert.strictEqual(path.get("elements", 0), first);
    assert.strictEqual(path.get("elements", 1), second);
    assert.strictEqual(first.name, 0);
    assert.strictEqual(second.name, 1);

    assert.strictEqual(path.get("elements").pop(), second.value);
    assert.strictEqual(path.get("elements", "length").value, 1);
    assert.strictEqual(path.get("elements", 0), first);
    assert.strictEqual(first.name, 0);

    assert.strictEqual(path.get("elements").pop(), first.value);
    assert.strictEqual(path.get("elements").pop(), void 0);
    assert.strictEqual(path.get("elements", "length").value, 0);
  });

  it("should throw when path.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").pop();
    });
  });
});

describe("path.insertAt", function() {
  it("should insert nodes at the given index", function() {
    var path = new NodePath({
      elements: [0, "foo", true]
    });

    var elems = path.get("elements");
    elems.insertAt(1, "a", "b");
    assert.deepEqual(elems.value, [0, "a", "b", "foo", true]);

    elems.insertAt(elems.get("length").value + 1, []);
    assert.deepEqual(elems.value, [0, "a", "b", "foo", true,, []]);
    assert.strictEqual(elems.get("length").value, 7);

    elems.insertAt(elems.get("length").value + 12345);
    assert.deepEqual(elems.value, [0, "a", "b", "foo", true,, []]);
    assert.strictEqual(elems.get("length").value, 7);

    elems.insertAt(-2, -2, -1);
    assert.deepEqual(elems.value, [-2, -1, 0, "a", "b", "foo", true,, []]);
    assert.strictEqual(elems.get("length").value, 9);
  });

  it("should insert nodes even when path.value is empty", function() {
    var path = new NodePath({
      elements: []
    });

    var elems = path.get("elements");
    elems.insertAt(0, 0, "foo", true);
    assert.deepEqual(elems.value, [0, "foo", true]);

    elems.replace([]);
    elems.insertAt(1, 0, "foo", true);
    assert.deepEqual(elems.value, [, 0, "foo", true]);
  });

  it("should throw when path.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").insertAt(0);
    });
  });
});

describe("path.insertBefore", function() {
  it("should insert nodes before the current path", function() {
    var zero = b.literal(0);
    var one = b.literal(1);
    var two = b.literal(2);
    var foo = b.literal("foo");
    var truth = b.literal(true);

    var path = new NodePath(b.sequenceExpression([zero, foo, truth]));
    var fooPath = path.get("expressions", 1);
    var truePath = path.get("expressions", 2);
    fooPath.insertBefore(one, two);
    assert.deepEqual(
      fooPath.parent.node.expressions,
      [zero, one, two, foo, truth]
    );

    assert.strictEqual(path.get("expressions", 3), fooPath);
    assert.strictEqual(fooPath.value.value, "foo");

    assert.strictEqual(path.get("expressions", 4), truePath);
    assert.strictEqual(truePath.value.value, true);
  });

  it("should throw when path.parentPath.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").insertBefore(0);
    });
  });
});

describe("path.insertAfter", function() {
  it("should insert nodes after the current path", function() {
    var zero = b.literal(0);
    var one = b.literal(1);
    var two = b.literal(2);
    var foo = b.literal("foo");
    var truth = b.literal(true);

    var path = new NodePath(b.sequenceExpression([zero, foo, truth]));
    var fooPath = path.get("expressions", 1);
    var truePath = path.get("expressions", 2);
    fooPath.insertAfter(one, two);
    assert.deepEqual(
      fooPath.parent.node.expressions,
      [zero, foo, one, two, truth]
    );

    assert.strictEqual(path.get("expressions", 1), fooPath);
    assert.strictEqual(fooPath.value.value, "foo");

    assert.strictEqual(path.get("expressions", 2).value.value, 1);
    assert.strictEqual(path.get("expressions", 3).value.value, 2);

    assert.strictEqual(path.get("expressions", 4), truePath);
    assert.strictEqual(truePath.value.value, true);

    var three = b.literal(3)
    truePath.insertAfter(three);
    assert.deepEqual(
      fooPath.parent.node.expressions,
      [zero, foo, one, two, truth, three]
    );
  });

  it("should throw when path.parentPath.value not an array", function() {
    assert.throws(function() {
      new NodePath({ foo: 42 }).get("foo").insertAfter(0);
    });
  });
});

describe("types.astNodesAreEquivalent", function() {
  it("should work for simple values", function() {
    astNodesAreEquivalent.assert(1, 2 - 1);
    astNodesAreEquivalent.assert("1", 1);
    astNodesAreEquivalent.assert(true, !false);

    var d1 = new Date;
    var d2 = new Date(+d1);
    assert.notStrictEqual(d1, d2);
    astNodesAreEquivalent.assert(d1, d2);

    astNodesAreEquivalent.assert(/x/, /x/);
    assert.strictEqual(astNodesAreEquivalent(/x/g, /x/), false);
  });

  it("should work for arrays", function() {
    astNodesAreEquivalent.assert([], [1, 2, 3].slice(10));
    astNodesAreEquivalent.assert([1, 2, 3], [1].concat(2, [3]));
    astNodesAreEquivalent.assert([1,, 3], [1,, 3,]);
    assert.strictEqual(
      astNodesAreEquivalent([1,, 3], [1, void 0, 3]),
      false
    );
  });

  it("should work for objects", function() {
    astNodesAreEquivalent.assert({
      foo: 42,
      bar: "asdf"
    }, {
      bar: "asdf",
      foo: 42
    });

    assert.strictEqual(astNodesAreEquivalent({
      foo: 42,
      bar: "asdf",
      baz: true
    }, {
      bar: "asdf",
      foo: 42
    }), false);

    assert.strictEqual(astNodesAreEquivalent({
      foo: 42,
      bar: "asdf"
    }, {
      bar: "asdf",
      foo: 42,
      baz: true
    }), false);
  });

  it("should work for AST nodes", function() {
    function check(src1: any, src2: any) {
      astNodesAreEquivalent.assert(parse(src1), parse(src2));
    }

    function checkNot(src1: any, src2: any) {
      var ast1 = parse(src1, { loc: true, range: true });
      var ast2 = parse(src2, { loc: true });

      assert.throws(function() {
        astNodesAreEquivalent.assert(ast1, ast2);
      });

      var problemPath: any[] = [];
      astNodesAreEquivalent(parse(src1), parse(src2), problemPath);
      assert.notStrictEqual(problemPath.length, 0);

      var a: any = ast1;
      var b: any = ast2;

      problemPath.forEach(function(name) {
        assert.strictEqual(name in a, true);
        assert.strictEqual(name in b, true);
        a = a[name];
        b = b[name];
      });

      assert.notStrictEqual(a, b);
    }

    check("1\n;", "1;");

    check("console.log(this.toString(36));", [
      "// leading comment",
      "console.log(",
      "  this.toString(36)",
      "/* trailing comment */)"
    ].join("\n"));

    check("foo()", "foo /*anonymous*/ ()");

    check("new (bar(1,2)(3,4)).baz.call(null)",
          "new(  bar(     1,2)  \n  (3,4)).  baz.call(   null)");

    check([
      "(function(x) {",
      "  Foo = /asdf/.test(x);",
      "}());"
    ].join("\n"), [
      "(function(x) {",
      "  Foo = /asdf/.test(x);",
      "})();"
    ].join("\n\n"));

    checkNot([
      "(function(x) {",
      "  Foo = /asdf/.test(x);",
      "}());"
    ].join("\n"), [
      "(function(x) {",
      "  Foo = /asdf/.test(x);",
      "})('~asdf~');"
    ].join("\n\n"));

    checkNot([
      "(function(x) {",
      "  var Foo = /asdf/.test(x);",
      "}());"
    ].join("\n"), [
      "(function(x) {",
      "  Foo = /asdf/.test(x);",
      "})(/*'~asdf~'*/);"
    ].join("\n\n"));
  });
});

describe("RegExpLiteral nodes", function() {
  it("should have a default-computable .regex field", function() {
    var ast = parse('/x*/gmi.test("xxx")');
    var regExp: Literal | undefined;
    var statement = ast.body[0];
    if (statement.type === "ExpressionStatement" &&
        statement.expression.type === "CallExpression" &&
        statement.expression.callee.type === "MemberExpression" &&
        statement.expression.callee.object.type === "Literal") {
      regExp = statement.expression.callee.object;
    }

    assert(regExp !== undefined);
    if (regExp) {
      n.Literal.assert(regExp);
      isRegExp.assert(regExp.value);

      var regex = getFieldValue(regExp, "regex");

      regex.flags = regex.flags.split("").sort().join("");

      assert.deepEqual(regex, {
        pattern: "x*",
        flags: "gim"
      });

      Type.from({
        pattern: isString,
        flags: isString
      }).assert(regex);
    }
  });

  it("should typecheck with explicit .regex field", function() {
    var stringLiteral = b.literal("asdf");
    assert.strictEqual(hasOwn.call(stringLiteral, "regex"), false);
    n.Literal.assert(stringLiteral, true);

    const regExpLiteral = b.regExpLiteral("a.b", "gi");
    const regex = rawTypes.getFieldValue(regExpLiteral, "regex");
    assert.strictEqual(regex.pattern, "a.b");
    assert.strictEqual(regex.flags, "gi");
    n.Literal.assert(regExpLiteral, true);

    regex.pattern = 1234;
    assert.strictEqual(n.Literal.check(regExpLiteral, true), false);
  });
});

describe("BigIntLiteral nodes", function () {
  it("should parse correctly with Babylon", function () {
    var types = fork([
      babelDef,
    ]);
    var n = types.namedTypes;
    var BigIntLiteral = n.BigIntLiteral;

    function check(code: any) {
      parseAndCheck(code);
      parseAndCheck("-" + code);
      parseAndCheck("+" + code);
    }

    function parseAndCheck(code: any) {
      var program = babylonParse(code);
      var exp = program.body[0].expression;
      if (n.UnaryExpression.check(exp)) {
        checkExp(exp.argument);
      } else {
        checkExp(exp);
      }
    }

    function checkExp(exp: any) {
      BigIntLiteral.assert(exp, true);

      assert.strictEqual(
        exp.extra.rawValue,
        exp.value
      );

      assert.strictEqual(
        exp.extra.raw,
        exp.value + "n"
      );

      delete exp.extra;

      BigIntLiteral.assert(exp, true);

      var extra = types.getFieldValue(exp, "extra");

      assert.strictEqual(
        extra.rawValue,
        exp.value
      );

      assert.strictEqual(
        extra.raw,
        exp.value + "n"
      );
    }

    check("0n");
    check("12345n");
    check("0b101011101n");
    check("0xFFF123n");
    check("0xfff123n");
    check("728374682736419273912879879610912837401293846n");
    check("0xc00cda0a30d6312b54c55789befdea84f5949d92n");
    check("0o16432n");
  });
});

describe("MemberExpression", function() {
  it("should set computed flag to false by default", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.identifier('bar'),
    );

    assert.strictEqual(memberExpression.computed, false)
  });

  it("should not set computed to true if property is a callExpression", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.callExpression(b.identifier('bar'), []),
    );

    assert.strictEqual(memberExpression.computed, false)
  });

  it("should set computed flag to true if property is a literal", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.literal('bar'),
    );

    assert.strictEqual(memberExpression.computed, true)
  });

  it("should set computed flag to true if property is a memberExpression", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.memberExpression(b.identifier('foo'), b.literal('bar')),
    );

    assert.strictEqual(memberExpression.computed, true)
  });

  it("should set computed flag to true if property is a binaryExpression", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.memberExpression(b.identifier('foo'), b.literal('bar')),
    );

    assert.strictEqual(memberExpression.computed, true)
  });

  it("should override computed value when passed as a third argument to the builder", function(){
    var memberExpression = b.memberExpression(
      b.identifier('foo'),
      b.callExpression(b.identifier('bar'), []),
      true,
    );

    assert.strictEqual(memberExpression.computed, true);
  });
});

describe("Optional Chaining", function () {
  describe("ChainExpression", function () {
    it("should set expression.optional in CallExpression to false by default", function () {
      const chainExpression = b.chainExpression(
        b.callExpression(
          b.identifier("call"),
          [],
        ),
      );

      n.CallExpression.assert(chainExpression.expression);
      n.ChainElement.assert(chainExpression.expression);

      assert.strictEqual(chainExpression.expression.optional, false);
    });

    it("can set expression.optional in CallExpression to true", function () {
      const chainExpression = b.chainExpression(
        b.callExpression.from({
          callee: b.identifier("fn"),
          arguments: [],
          optional: true,
        }),
      );

      n.CallExpression.assert(chainExpression.expression);
      n.ChainElement.assert(chainExpression.expression);

      assert.strictEqual(chainExpression.expression.optional, true);
    });

    it("should set expression.optional in MemberExpression to false by default", function () {
      const chainExpression = b.chainExpression(
        b.memberExpression(
          b.identifier("a"),
          b.identifier("b"),
          false,
        ),
      );

      n.MemberExpression.assert(chainExpression.expression);
      n.ChainElement.assert(chainExpression.expression);

      assert.strictEqual(chainExpression.expression.optional, false);
    });

    it("can set expression.optional in MemberExpression to true", function () {
      const chainExpression = b.chainExpression(
        b.memberExpression.from({
          object: b.identifier("a"),
          property: b.identifier("b"),
          computed: false,
          optional: true,
        }),
      );

      n.MemberExpression.assert(chainExpression.expression);
      n.ChainElement.assert(chainExpression.expression);

      assert.strictEqual(chainExpression.expression.optional, true);
    });
  });

  describe('OptionalCallExpression', function() {
    it("should set optional to true by default", function () {
      const optionalCallExpression = b.optionalCallExpression(
        b.identifier('foo'),
        []
      );

      n.OptionalCallExpression.assert(optionalCallExpression);
      n.CallExpression.assert(optionalCallExpression);
      n.ChainElement.assert(optionalCallExpression);

      assert.strictEqual(optionalCallExpression.optional, true);
    });

    it("should allow optional to be false", function () {
      const optionalCallExpression = b.optionalCallExpression(
        b.identifier('foo'),
        [],
        false
      );

      n.OptionalCallExpression.assert(optionalCallExpression);
      n.CallExpression.assert(optionalCallExpression);
      n.ChainElement.assert(optionalCallExpression);

      assert.strictEqual(optionalCallExpression.optional, false);
    });
  });

  describe('OptionalMemberExpression', function () {
    it("should set optional to true by default", function () {
      const optionalMemberExpression = b.optionalMemberExpression(
        b.identifier('foo'),
        b.identifier('bar')
      );

      n.OptionalMemberExpression.assert(optionalMemberExpression);
      n.MemberExpression.assert(optionalMemberExpression);
      n.ChainElement.assert(optionalMemberExpression);

      assert.strictEqual(optionalMemberExpression.optional, true);
    });

    it("should allow optional to be false", function () {
      const optionalMemberExpression = b.optionalMemberExpression(
        b.identifier('foo'),
        b.identifier('bar'),
        true,
        false
      );

      n.OptionalMemberExpression.assert(optionalMemberExpression);
      n.MemberExpression.assert(optionalMemberExpression);
      n.ChainElement.assert(optionalMemberExpression);

      assert.strictEqual(optionalMemberExpression.optional, false);
    });
  });
});

describe('Nullish Coalescing Operator', function() {
  it('should allow `??` as operator', function() {
    var logicalExpression = b.logicalExpression(
      "??",
      b.identifier("a"),
      b.identifier("b")
    );

    assert.strictEqual(logicalExpression.operator, "??");
  });

  it('should not allow `crap` as operator', function() {
    assert.throws(function() {
      b.logicalExpression(
        "crap" as $InvalidType,
        b.identifier("a"),
        b.identifier("b")
      );
    }, "does not match field \"operator\"");
  });
});

describe('Dynamic import', () => {
  const {
    visit,
    namedTypes: n,
    builders: b,
  } = fork([ esProposalsDef ]);

  it('should work with expression values', () => {
    const importExpression =  b.importExpression(
      b.sequenceExpression([
        b.literal(0),
        b.literal("foo"),
      ])
    );

    assert.deepStrictEqual(
      importExpression.source,
      b.sequenceExpression([
        b.literal(0),
        b.literal("foo"),
      ])
    );
  });

  it('should not allow empty source', () => {
    assert.throws(() => {
      b.importExpression(
        undefined as $InvalidType
      );
    });
  });

  it('should parse with espree', () => {
    const code = [
      "import { foo } from './foo';",
      "import('./bar')",
    ].join('\n');

    const ast = espree.parse(code, {
      sourceType: 'module',
      ecmaVersion: 2020
    });

    visit(ast, {
      visitImportDeclaration(path) {
        assert.strictEqual(path.node.source.value, "./foo");
        this.traverse(path);
      },
      visitImportExpression(path) {
        const source = path.node.source as Literal;
        n.Literal.check(source);
        assert.strictEqual(source.value, "./bar");
        this.traverse(path);
      }
    })
  });
});
