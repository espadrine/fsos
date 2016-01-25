var fs = require('fs');
var path = require('path');
var Promise = require('promise');

function promisify(func) {
  return function() {
    var _this = this;
    var args = Array.prototype.slice.call(arguments, 0);
    // Note: "this" is extracted from this scope.
    return new Promise(function (accept, reject) {
      // Add the callback function to the list of args
      args.push(function (err) {
        var rest = Array.prototype.slice.call(arguments, 1);
        if (err !== null) {
          return reject(err);
        }
        return accept(rest.length === 1 ? rest[0] : rest);
      });
      // Call the callback-based function
      func.apply(_this, args);
    });
  };
}

var pReadFile = promisify(fs.readFile);
var get = pReadFile;

var MAX = 4294967296;
function randFileName(dir) {
  return new Promise(function(resolve, reject) {
    // Note: this may not be very random, potentially causing collisions in some
    // workloads.
    var rand = '' + ((Math.random() * MAX) >>> 0) +
      ((Math.random() * MAX) >>> 0) +
      ((Math.random() * MAX) >>> 0) +
      ((Math.random() * MAX) >>> 0);
    resolve(path.join(dir, rand));
  });
}

var pWriteFile = promisify(fs.writeFile);
var pRename = promisify(fs.rename);

function set(key, value) {
  return new Promise(function(resolve, reject) {
    // FIXME: read (and set the tmp file to) the file's permissions.
    var dir = path.dirname(key);
    var filename;
    randFileName(dir).then(function(tmp) {
      // FIXME: retry if the file already exists.
      filename = tmp;
      return pWriteFile(tmp, value, {flag:'ax'});
    }).then(function() {
      return pRename(filename, key);
    }).then(function() {
      // FIXME: fsync.
      // Ensure we don't call resolve with a non-null argument.
      resolve();
    }).catch(reject);
  });
}

exports.get = get;
exports.set = set;
