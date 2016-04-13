#!/usr/bin/env node

/**
 * Usage: transform.js
 *
 * A simplified transform demonstrating the source map issue when wrapping a
 * function in a then(..) call. Writes build/out.js and build/out.js.map which
 * you can then upload to the source map visualizer:
 *
 * http://sokra.github.io/source-map-visualization/#custom-choose
 *
 * See Issue: https://github.com/benjamn/recast/issues/273
 */

"use strict";

var recast = require('recast');
var types = require("ast-types");
var namedTypes = require("ast-types").namedTypes;
var b = require("ast-types").builders;
var fs = require('fs');

var source = `f();`;
var ast = recast.parse(source, { sourceFileName: 'em://app/app.js' });

/**
 * Given "foo", [args] returns Runtime.call({name: "foo", func: foo, args:
 * [...]})
 */
function buildRuntimeCallExpr (name, args) {
  return b.callExpression(
    b.memberExpression(
      b.identifier('Runtime'),
      b.identifier('call'),
      false
    ), [
      b.objectExpression([
        b.property('init', b.identifier('name'), b.literal(name)),
        b.property('init', b.identifier('func'), b.identifier(name)),
        b.property('init', b.identifier('args'), b.arrayExpression(args)),
      ])
    ]
  );
}

/**
 * Given f() returns f().then(() => {})
 */
function buildThenCallExpr (callExpr) {
  return b.callExpression(
    b.memberExpression(callExpr, b.identifier('then')), 
    [
      b.arrowFunctionExpression([/* args */], b.blockStatement([]))
    ]
  );
}

/**
 * Look for the call expression statements like f(n); and transform them to
 * Runtime.call({name: "f", func: f, args: [n]}).then(() => {}).
 */
recast.visit(ast, {
  visitExpressionStatement: function (path) {
    if (path.get('expression', 'type').value == 'CallExpression') {
      let funcName = path.node.expression.callee.name;
      let args = path.node.expression.arguments;
      let replace = buildThenCallExpr( buildRuntimeCallExpr(funcName, args) );
      path.get('expression').replace(replace);
    }

    this.traverse(path);
  }
});

/**
 * Write the output to build/app.js and build/app.js.map.
 */

var printed = recast.print(ast, { sourceMapName: 'app.js' });

console.log('writing transformed code to build/app.js');
fs.writeFileSync('build/app.js', printed.code);

console.log('writing source map build/app.js.map');
fs.writeFileSync('build/app.js.map', JSON.stringify(printed.map));
