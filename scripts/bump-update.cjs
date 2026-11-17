// Increment the owner-visible update once when preparing a new game update.
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(filename, 'utf8');
const pattern = /<small id="release-label" class="build-version" data-update="(\d+)"[^>]*>Update 0\.(\d+) By M\.AlNajm<\/small>/g;
const matches = [...html.matchAll(pattern)];
if (matches.length !== 1 || matches[0][1] !== matches[0][2]) throw new Error('Expected one consistent version label');
const next = Number(matches[0][1]) + 1;
if (!Number.isSafeInteger(next)) throw new Error('Invalid update number');
const label = '<small id="release-label" class="build-version" data-update="' + next + '" aria-label="رقم تحديث اللعبة: 0.' + next + '، بواسطة M.AlNajm">Update 0.' + next + ' By M.AlNajm</small>';
fs.writeFileSync(filename, html.replace(pattern, label));
console.log('Update 0.' + next + ' By M.AlNajm');
