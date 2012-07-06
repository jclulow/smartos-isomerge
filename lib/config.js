#!/usr/bin/env node

function readStdinConfig(callback) {
  // read json from stdin describing the operation
  var C;
  var json = '';
  process.stdin.on('data', function(d) {
    json += d.toString('utf8');
  });
  process.stdin.on('end', function() {
    try {
      C = JSON.parse(json);
    } catch (ex) {
      return callback(new Error('config parse error: ' + ex.message));
    }
    return callback(null, C);
  });
  process.stdin.resume();
}

module.exports.readStdinConfig = readStdinConfig;
