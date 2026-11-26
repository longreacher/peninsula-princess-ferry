import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(html, /id="startBtn" class="primary-button">Start GPS timer<\/button>/, 'GPS fallback button must be visible on launch');
assert.doesNotMatch(app, /startBtn\.hidden\s*=/, 'GPS fallback button must never be hidden by JavaScript');
assert.match(app, /function attemptAutomaticGps\(\)[\s\S]*?requestPosition\(\);/, 'Automatic GPS startup helper must request a position');
assert.match(app, /window\.addEventListener\('pageshow', attemptAutomaticGps\)/, 'GPS must retry when an iPhone PWA is restored');
assert.match(app, /window\.addEventListener\('load', attemptAutomaticGps, \{ once: true \}\)/, 'GPS must be attempted on initial load');
assert.match(app, /elements\.startBtn\.addEventListener\('click',[\s\S]*?requestPosition\(\)/, 'Visible GPS button must manually request a position');
assert.match(app, /bufferMinutes: saved\.bufferMinutes \?\? 1/, 'Default loading buffer must remain one minute');
assert.match(html, /id="bufferInput"[^>]*value="1"/, 'Settings control must retain the one-minute default');
assert.match(serviceWorker, /ferry-timer-v1\.0\.4/, 'Cache version must match this release');

console.log('Automatic GPS startup, persistent fallback control, and one-minute buffer tests passed.');
