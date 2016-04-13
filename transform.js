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

types.visit(ast, {
  visitCallExpression: function (path) {
    // replacing callee seems to cause the location issue.
    path.get('callee').replace(b.identifier('foo'));
    this.traverse(path);
  }
});

var printed = recast.print(ast, { sourceMapName: 'app.js' });

console.log('writing transformed code to build/app.js');
fs.writeFileSync('build/app.js', printed.code);

console.log('writing source map build/app.js.map');
fs.writeFileSync('build/app.js.map', JSON.stringify(printed.map));
