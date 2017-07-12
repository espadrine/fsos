var assert = require('assert');
var fsos = require('.');
var fs = require('fs');
var path = require('path');

var thrownCount = 0;
var assertPromiseNotThrown = function(e) {
  console.error(e.stack);
  assert(false, 'Error thrown:\n' + e.stack);
};

// Test with new file.
var testFile = 'test-1';
var testDir = 'test-dir';
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

// Test without directory autocreation.
.then(function() {
  return fsos.set(path.join(testDir, testFile), 'hi', {noMkdir: true});
}).catch(function(e) {
  assert.equal(e.code, 'ENOENT');
  thrownCount++;
})

// Test with directory autocreation.
.then(function() {
  return fsos.set(path.join(testDir, testFile), 'hi');
}).then(function() {
  return fsos.get(path.join(testDir, testFile));
}).then(function(val) {
  assert.equal(''+val, 'hi');
}).catch(assertPromiseNotThrown)

// Test deletion.
.then(function() { return fsos.delete(testFile); })
.then(function() { return fsos.delete(path.join(testDir, testFile)); })
.then(function() { return fsos.deleteDir(testDir); })
.then(function() {
  return fsos.get(testFile);
}).catch(function(e) {
  assert.equal(e.code, 'ENOENT');
  thrownCount++;
}).then(function() {
  assert.equal(thrownCount, 2);
}).catch(assertPromiseNotThrown)

.then(function() {
  console.log('done');
}).catch(function(e) { console.error(e); });
