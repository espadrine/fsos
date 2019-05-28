'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var constants = require('constants');
var mkdirp = require('mkdirp');
if (this.Promise === undefined) {
  this.Promise = require('promise');
}

function promisify(func) {
  return function() {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 0);
    // Note: "this" is extracted from this scope.
    return new Promise(function (resolve, reject) {
      // Add the callback function to the list of args
      args.push(function (err) {
        if (err !== null) { return reject(err); }
        var rest = Array.prototype.slice.call(arguments, 1);
        return resolve(rest.length > 1 ? rest : (rest.length === 1 ? rest[0] : undefined));
      });
      // Call the callback-based function
      func.apply(self, args);
    });
  };
}

var pMkdirp = promisify(mkdirp);
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
    resolve(path.join(dir, '.' + rand));
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
  options = options || {}
  var dir = path.dirname(key);
  var noMkdir = !!options.noMkdir;
  var tmpname;
  var fd;
  var mode;
  var automakeDir;
  if (!noMkdir) {
    automakeDir = pMkdirp(dir);
  } else {
    automakeDir = Promise.resolve();
  }
  return automakeDir.then(function() {
    return pStat(key);
  }).then(function(stats) {
    mode = stats.mode;
    return randFileName(dir);
  }).catch(function(e) {
    if (e.code === 'ENOENT') {
      mode = 0x1b6;  // 0b110110110 aka. read/write.
      return randFileName(dir);
    } else {
      return Promise.reject(e);
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
  }).catch(function(e) {
    return pUnlink(tmpname)
    .then(function() { return Promise.reject(e); })
    .catch(function(_) { return Promise.reject(e); })
  }).then(function() {
    // Fsync the file's directory.
    return pOpen(path.dirname(key), constants.O_RDONLY);
  }).then(function(fileDescriptor) {
    fd = fileDescriptor;
    return pFsync(fd);
  }).then(function() {
    return pClose(fd);
  });
}

exports.get = get;
exports.set = set;
exports.delete = del;
exports.deleteDir = prmdir;  // Non-public
