var assert = require('assert').strict;
var fsos = require('.');
var fs = require('fs');
var path = require('path');

// Test with new file.
var testFile = 'test-1';
var testDir = 'test-dir';
try { fs.unlinkSync(testFile); } catch(_) {}

(async () => {

  await fsos.set(testFile, 'hello');
  assert.equal(String(await fsos.get(testFile)), 'hello');

  // Test with existing file.
  await fsos.set(testFile, 'hi');
  assert.equal(String(await fsos.get(testFile)), 'hi');

  // Test without directory autocreation.
  await assert.rejects(
    fsos.set(path.join(testDir, testFile), 'hi', {noMkdir: true}),
    { code: 'ENOENT' });

  // Test with directory autocreation.
  await fsos.set(path.join(testDir, testFile), 'hi');
  assert.equal(String(await fsos.get(path.join(testDir, testFile))), 'hi');

  // Test deletion.
  await fsos.delete(testFile);
  await fsos.delete(path.join(testDir, testFile));
  await fsos.deleteDir(testDir);
  await assert.rejects(fsos.get(testFile), { code: 'ENOENT' });

  console.log('done');
})().catch(e => { process.nextTick(() => { throw e; }); throw e; });
