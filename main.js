var fs = require('fs');
var path = require('path');
var Promise = require('promise');

function get(key, value) {
  return new Promise(function(resolve, reject) {
    fs.readFile(key, function(err, data) {
      if (err != null) { reject(err); return; }
      resolve(data);
    });
  });
}

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

function set(key, value) {
  return new Promise(function(resolve, reject) {
    // FIXME: read (and set the tmp file to) the file's permissions.
    var dir = path.dirname(key);
    randFileName(dir).then(function(tmp) {
      // FIXME: retry if the file alreay exists.
      fs.writeFile(tmp, value, {flag:'ax'}, function(err) {
        if (err != null) { reject(err); return; }
        fs.rename(tmp, key, function(err) {
          if (err != null) { reject(err); return; }
          // FIXME: fsync.
          resolve();
        });
      });
    }).catch(function(e) { reject(e); });
  });
}

exports.get = get;
exports.set = set;
