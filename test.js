var assert = require('assert');
var fsos = require('.');
var fs = require('fs');

var thrownCount = 0;
var assertPromiseNotThrown = function(e) {
  console.error(e.stack);
  assert(false, 'Error thrown:\n' + e.stack);
};

// Test with new file.
var testFile = 'test-1';
try { fs.unlinkSync(testFile); } catch(_) {}

fsos.set(testFile, 'hello')
.then(function() {
  return fsos.get(testFile);
}).then(function(val) {
  assert.equal(''+val, 'hello');
}).catch(assertPromiseNotThrown)

// Test with existing file.
.then(function() {
  return fsos.set(testFile, 'hi');
}).then(function() {
  return fsos.get(testFile);
}).then(function(val) {
  assert.equal(''+val, 'hi');
}).catch(assertPromiseNotThrown)

// Test deletion.
.then(function() {
  return fsos.delete(testFile);
}).then(function() {
  return fsos.get(testFile);
}).catch(function(e) {
  assert.equal(e.code, 'ENOENT');
  thrownCount++;
}).then(function() {
  assert.equal(thrownCount, 1);
}).catch(assertPromiseNotThrown)

.then(function() {
  console.log('done');
});
