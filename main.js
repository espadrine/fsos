var fs = require('fs');
var Promise = require('promise');

function get(key, value) {
  return new Promise(function(resolve, reject) {
    fs.readFile(key, function(err, data) {
      if (err != null) { reject(err); return; }
      resolve(data);
    });
  });
}

exports.get = get;
