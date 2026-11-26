import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(html, /id="startBtn"[^>]*\shidden(?:\s|>)/, 'GPS fallback button must be hidden on launch');
assert.match(app, /setOnlineState\(\); setDirection\(state\.direction\); render\(\); requestPosition\(\);/, 'GPS must be requested automatically during launch');
assert.match(app, /function positionError[\s\S]*?elements\.startBtn\.hidden = false;/, 'GPS fallback button must appear after an error');
assert.match(app, /function positionSuccess[\s\S]*?elements\.startBtn\.hidden = true;/, 'GPS fallback button must remain hidden after success');
assert.match(app, /bufferMinutes: saved\.bufferMinutes \?\? 1/, 'Default loading buffer must remain one minute');
assert.match(html, /id="bufferInput"[^>]*value="1"/, 'Settings control must retain the one-minute default');
assert.match(serviceWorker, /ferry-timer-v1\.0\.2/, 'Cache version must match this release');

console.log('Automatic GPS startup, fallback control, and one-minute buffer tests passed.');
