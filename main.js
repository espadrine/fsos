var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var constants = require('constants');
var mkdirp = require('mkdirp-then');
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

var pUnlink = promisify(fs.unlink);

function del(key) {
  return new Promise(function(resolve, reject) {
    pUnlink(key).then(function() {
      // Ensure we don't call resolve with a non-null argument.
      resolve();
    }).catch(function(e) {
      if (e.code === 'ENOENT') { resolve(); }
      else { reject(e); }
    });
  });
}

function base64url(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function randFileName(dir) {
  return new Promise(function(resolve, reject) {
    // A UUID is a 128-bit value, so it is equivalent to 16 bytes.
    var rand128 = crypto.randomBytes(16);
    var rand = base64url(rand128.toString('base64'));
    resolve(path.join(dir, rand));
  });
}

var pOpen = promisify(fs.open);
var pClose = promisify(fs.close);
var pStat = promisify(fs.stat);
var pWrite = promisify(fs.write);
var pRename = promisify(fs.rename);
var pFsync = promisify(fs.fsync);
var prmdir = promisify(fs.rmdir);

function set(key, value, options) {
  return new Promise(function(resolve, reject) {
    options = options || {}
    var dir = path.dirname(key);
    var noMkdir = !!options.noMkdir;
    var tmpname;
    var fd;
    var mode;
    var automakeDir;
    if (!noMkdir) {
      automakeDir = mkdirp(dir);
    } else {
      automakeDir = Promise.resolve();
    }
    automakeDir.then(function() {
      return pStat(key);
    }).then(function(stats) {
      mode = stats.mode;
      return randFileName(dir);
    }).catch(function(e) {
      if (e.code === 'ENOENT') {
        mode = 0666;
        return randFileName(dir);
      } else {
        throw e;
      }
    }).then(function(tmp) {
      // FIXME: retry if the file already exists.
      tmpname = tmp;
      return pOpen(tmpname,
        constants.O_WRONLY | constants.O_EXCL | constants.O_CREAT,
        mode);
    }).then(function(fileDescriptor) {
      fd = fileDescriptor;
      return pWrite(fd, value);
    }).then(function() {
      return pFsync(fd);
    }).then(function() {
      return pClose(fd);
    }).then(function() {
      return pRename(tmpname, key);
    }).then(function() {
      // Fsync the file's directory.
      return pOpen(path.dirname(key), constants.O_RDONLY);
    }).then(function(fileDescriptor) {
      fd = fileDescriptor;
      return pFsync(fd);
    }).then(function() {
      return pClose(fd);
    }).then(function() {
      // Ensure we don't call resolve with a non-null argument.
      resolve();
    }).catch(reject);
  });
}

exports.get = get;
exports.set = set;
exports.delete = del;
exports.deleteDir = prmdir;  // Non-public
