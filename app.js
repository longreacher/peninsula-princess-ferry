import { DIRECTIONS, ZONE, haversineKm, nearestDirection, upcomingSailings } from './schedule.mjs';

const $ = selector => document.querySelector(selector);
const elements = {
  statusCard: $('#statusCard'), statusPill: $('#statusPill'), lastUpdated: $('#lastUpdated'), nextLabel: $('#nextLabel'),
  departureTime: $('#departureTime'), dayLabel: $('#dayLabel'), slackPrefix: $('#slackPrefix'), slackTime: $('#slackTime'),
  statusMessage: $('#statusMessage'), startBtn: $('#startBtn'), etaValue: $('#etaValue'), etaSource: $('#etaSource'),
  distanceValue: $('#distanceValue'), accuracyValue: $('#accuracyValue'), arrivalValue: $('#arrivalValue'), bufferValue: $('#bufferValue'),
  sailingList: $('#sailingList'), scheduleType: $('#scheduleType'), autoDirection: $('#autoDirection'), settingsBtn: $('#settingsBtn'),
  settingsDialog: $('#settingsDialog'), bufferInput: $('#bufferInput'), bufferOutput: $('#bufferOutput'), speedInput: $('#speedInput'),
  speedOutput: $('#speedOutput'), scheduleOverride: $('#scheduleOverride'), wakeLockInput: $('#wakeLockInput'), networkBadge: $('#networkBadge'),
  installBtn: $('#installBtn'), toast: $('#toast')
};

const saved = JSON.parse(localStorage.getItem('ferryTimerSettings') || '{}');
const queryDirection = new URLSearchParams(location.search).get('direction');
const state = {
  direction: ['s2m','m2s'].includes(queryDirection) ? queryDirection : (saved.direction || 's2m'),
  autoDirection: saved.autoDirection ?? true,
  bufferMinutes: saved.bufferMinutes ?? 1,
  fallbackSpeed: saved.fallbackSpeed ?? 70,
  scheduleOverride: saved.scheduleOverride || 'auto',
  wakeLockEnabled: saved.wakeLockEnabled ?? true,
  position: null,
  routing: null,
  lastRouteAt: 0,
  lastRoutePosition: null,
  locating: false,
  started: false,
  wakeLock: null,
  installPrompt: null,
  timer: null,
  routeInFlight: false,
  locationRequestId: 0
};

const timeFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, weekday: 'long', month: 'short', day: 'numeric' });
const secondFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' });

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--:--';
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}` : `${minutes}:${String(secs).padStart(2,'0')}`;
}
function formatEta(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}
function saveSettings() {
  localStorage.setItem('ferryTimerSettings', JSON.stringify({
    direction: state.direction, autoDirection: state.autoDirection, bufferMinutes: state.bufferMinutes,
    fallbackSpeed: state.fallbackSpeed, scheduleOverride: state.scheduleOverride, wakeLockEnabled: state.wakeLockEnabled
  }));
}
function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => elements.toast.classList.remove('show'), 3200);
}
function setDirection(direction, manual = false) {
  if (!DIRECTIONS[direction]) return;
  const changed = state.direction !== direction;
  state.direction = direction;
  if (manual) {
    state.autoDirection = false;
    elements.autoDirection.checked = false;
  }
  document.querySelectorAll('.direction-button').forEach(button => button.classList.toggle('active', button.dataset.direction === direction));
  if (changed) { state.routing = null; state.lastRouteAt = 0; }
  saveSettings();
  render();
  if (state.position && changed) refreshRoute(true);
}
function scheduleTypeLabel(type, holiday) {
  if (holiday) return `${holiday} schedule`;
  return ({ weekday:'Weekday', saturday:'Saturday / holiday', sunday:'Sunday' })[type];
}
function computeFallbackRoute(position) {
  const directKm = haversineKm(position, DIRECTIONS[state.direction].landing);
  const distanceKm = Math.max(directKm, directKm * 1.22);
  return { distanceKm, durationSeconds: distanceKm / state.fallbackSpeed * 3600, source: 'Fallback estimate', fallback: true };
}
async function fetchRoadRoute(position) {
  const target = DIRECTIONS[state.direction].landing;
  const url = `https://router.project-osrm.org/route/v1/driving/${position.lon},${position.lat};${target.lon},${target.lat}?overview=false&steps=false&alternatives=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Routing HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No road route found');
    return { distanceKm: data.routes[0].distance / 1000, durationSeconds: data.routes[0].duration, source: 'Online road route', fallback: false };
  } finally {
    clearTimeout(timeout);
  }
}
async function refreshRoute(force = false) {
  if (!state.position || state.routeInFlight) return;
  const moved = state.lastRoutePosition ? haversineKm(state.position, state.lastRoutePosition) * 1000 : Infinity;
  if (!force && Date.now() - state.lastRouteAt < 20000 && moved < 75) return;
  state.routeInFlight = true;
  try {
    state.routing = navigator.onLine ? await fetchRoadRoute(state.position) : computeFallbackRoute(state.position);
  } catch (error) {
    state.routing = computeFallbackRoute(state.position);
  } finally {
    state.lastRouteAt = Date.now();
    state.lastRoutePosition = { ...state.position };
    state.routeInFlight = false;
    render();
  }
}
function positionSuccess(position) {
  state.locating = false;
  state.started = true;
  state.position = { lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy };
  if (state.autoDirection) setDirection(nearestDirection(state.position));
  elements.startBtn.disabled = false;
  elements.startBtn.textContent = 'Start GPS timer';
  requestWakeLock();
  refreshRoute(false);
  render();
}
function positionError(error) {
  state.locating = false;
  elements.startBtn.disabled = false;
  elements.startBtn.textContent = 'Start GPS timer';
  const message = error.code === 1 ? 'Location permission was denied. Enable it in browser settings, then try again.' : 'Your location could not be read. Check Windows Location Services and try again.';
  render();
  elements.statusMessage.textContent = message;
  toast(message);
}
function requestPosition() {
  if (!navigator.geolocation) return positionError({ code: 0 });
  const requestId = ++state.locationRequestId;
  state.locating = true;
  elements.startBtn.disabled = false;
  elements.startBtn.textContent = 'Start GPS timer';
  render();
  navigator.geolocation.getCurrentPosition(
    position => { if (requestId === state.locationRequestId) positionSuccess(position); },
    error => { if (requestId === state.locationRequestId) positionError(error); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 4000 }
  );
}
function attemptAutomaticGps() {
  if (!state.started && !state.locating) requestPosition();
}
async function requestWakeLock() {
  if (!state.wakeLockEnabled || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { state.wakeLock = await navigator.wakeLock.request('screen'); } catch (_) { /* optional enhancement */ }
}
function mainStatus(now, sailings, route) {
  if (!sailings.length) return null;
  const next = sailings[0];
  const driveSeconds = route?.durationSeconds ?? 0;
  const bufferSeconds = state.bufferMinutes * 60;
  const slackSeconds = (next.departure.getTime() - now.getTime()) / 1000 - driveSeconds - bufferSeconds;
  const arrival = new Date(now.getTime() + driveSeconds * 1000);
  const candidates = sailings.map(sailing => ({ sailing, slack: (sailing.departure.getTime() - now.getTime()) / 1000 - driveSeconds - bufferSeconds }));
  const catchable = candidates.find(item => item.slack >= 0);
  return { next, slackSeconds, arrival, catchable };
}
function render() {
  const now = new Date();
  const sailings = upcomingSailings(state.direction, now, state.scheduleOverride, 7);
  const status = mainStatus(now, sailings, state.routing);
  const next = status?.next;
  document.querySelectorAll('.direction-button').forEach(button => button.classList.toggle('active', button.dataset.direction === state.direction));
  elements.departureTime.textContent = next ? timeFmt.format(next.departure) : '--:--';
  elements.dayLabel.textContent = next ? `${dayFmt.format(next.departure)} · ${DIRECTIONS[state.direction].origin} departure` : 'New Brunswick time';
  elements.scheduleType.textContent = next ? scheduleTypeLabel(next.type, next.holiday) : 'Schedule';
  elements.bufferValue.textContent = `${state.bufferMinutes} min loading buffer`;
  elements.lastUpdated.textContent = state.started ? `Updated ${secondFmt.format(now)}` : state.locating ? 'Starting GPS' : 'Waiting for location';

  const route = state.routing;
  if (state.position && route) {
    elements.etaValue.textContent = formatEta(route.durationSeconds);
    elements.etaSource.textContent = route.source;
    elements.distanceValue.textContent = `${route.distanceKm.toFixed(route.distanceKm < 10 ? 1 : 0)} km`;
    elements.accuracyValue.textContent = `GPS ±${Math.round(state.position.accuracy)} m`;
    elements.arrivalValue.textContent = timeFmt.format(status.arrival);
  } else {
    elements.etaValue.textContent = '--'; elements.etaSource.textContent = state.locating ? 'Finding location…' : 'Waiting for GPS';
    elements.distanceValue.textContent = '--'; elements.accuracyValue.textContent = 'Accuracy --'; elements.arrivalValue.textContent = '--';
  }

  elements.statusCard.className = 'status-card neutral';
  if (!state.position || !route) {
    elements.statusPill.textContent = state.locating ? 'Locating' : 'Ready';
    elements.slackPrefix.textContent = state.locating ? 'Starting GPS automatically' : 'GPS unavailable'; elements.slackTime.textContent = '--:--';
    elements.statusMessage.textContent = state.locating
      ? `Allow location access when prompted. The next ${DIRECTIONS[state.direction].origin} sailing is shown.`
      : `The next ${DIRECTIONS[state.direction].origin} sailing is shown. Use the GPS button below to try again.`;
  } else if (status.slackSeconds >= 0) {
    elements.statusCard.className = 'status-card good';
    elements.statusPill.textContent = 'On track'; elements.slackPrefix.textContent = 'Ahead by'; elements.slackTime.textContent = formatDuration(status.slackSeconds);
    elements.statusMessage.textContent = `Estimated queue arrival ${timeFmt.format(status.arrival)}, including your ${state.bufferMinutes}-minute loading buffer.`;
  } else {
    elements.statusCard.className = 'status-card bad';
    elements.statusPill.textContent = 'Unlikely'; elements.slackPrefix.textContent = 'Behind by'; elements.slackTime.textContent = formatDuration(-status.slackSeconds);
    if (status.catchable) {
      elements.statusMessage.textContent = `The next sailing looks tight. Aim for ${timeFmt.format(status.catchable.sailing.departure)}; you are ${formatDuration(status.catchable.slack)} ahead for that one.`;
    } else {
      elements.statusMessage.textContent = 'No catchable sailing appears in the next listed departures. Check the official service before setting off.';
    }
  }

  const later = sailings.slice(1, 4);
  elements.sailingList.innerHTML = later.map(sailing => {
    const slack = route ? (sailing.departure.getTime() - now.getTime()) / 1000 - route.durationSeconds - state.bufferMinutes * 60 : null;
    const statusClass = slack === null ? '' : slack >= 0 ? 'catchable' : 'missed';
    const note = sailing.dayOffset ? dayFmt.format(sailing.departure) : (slack === null ? scheduleTypeLabel(sailing.type, sailing.holiday) : slack >= 0 ? `${formatDuration(slack)} spare` : `${formatDuration(-slack)} short`);
    return `<div class="sailing ${statusClass}"><strong>${timeFmt.format(sailing.departure)}</strong><span>${note}</span></div>`;
  }).join('');
}
function setOnlineState() {
  elements.networkBadge.textContent = navigator.onLine ? 'Online' : 'Offline';
  elements.networkBadge.classList.toggle('offline', !navigator.onLine);
  if (state.position) { state.lastRouteAt = 0; refreshRoute(true); }
}
function openSettings() {
  elements.bufferInput.value = state.bufferMinutes; elements.bufferOutput.value = `${state.bufferMinutes} min`;
  elements.speedInput.value = state.fallbackSpeed; elements.speedOutput.value = `${state.fallbackSpeed} km/h`;
  elements.scheduleOverride.value = state.scheduleOverride; elements.wakeLockInput.checked = state.wakeLockEnabled;
  elements.settingsDialog.showModal();
}

for (const button of document.querySelectorAll('.direction-button')) button.addEventListener('click', () => setDirection(button.dataset.direction, true));
elements.autoDirection.checked = state.autoDirection;
elements.autoDirection.addEventListener('change', event => {
  state.autoDirection = event.target.checked;
  if (state.autoDirection && state.position) setDirection(nearestDirection(state.position));
  saveSettings();
});
elements.startBtn.addEventListener('click', async () => { await requestWakeLock(); requestPosition(); });
elements.settingsBtn.addEventListener('click', openSettings);
elements.bufferInput.addEventListener('input', event => elements.bufferOutput.value = `${event.target.value} min`);
elements.speedInput.addEventListener('input', event => elements.speedOutput.value = `${event.target.value} km/h`);
$('#saveSettingsBtn').addEventListener('click', () => {
  state.bufferMinutes = Number(elements.bufferInput.value); state.fallbackSpeed = Number(elements.speedInput.value);
  state.scheduleOverride = elements.scheduleOverride.value; state.wakeLockEnabled = elements.wakeLockInput.checked;
  state.routing = state.position ? computeFallbackRoute(state.position) : null; state.lastRouteAt = 0;
  saveSettings(); render(); if (state.position) refreshRoute(true); requestWakeLock(); toast('Settings saved');
});
window.addEventListener('online', setOnlineState); window.addEventListener('offline', setOnlineState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (state.started) { requestWakeLock(); requestPosition(); }
  else attemptAutomaticGps();
});
window.addEventListener('pageshow', attemptAutomaticGps);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.installPrompt = event; elements.installBtn.hidden = false; });
elements.installBtn.addEventListener('click', async () => { if (!state.installPrompt) return; state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; elements.installBtn.hidden = true; });
window.addEventListener('appinstalled', () => toast('Ferry Timer installed'));

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
setOnlineState(); setDirection(state.direction); render();
if (document.readyState === 'complete') attemptAutomaticGps();
else window.addEventListener('load', attemptAutomaticGps, { once: true });
state.timer = setInterval(() => { if (state.started && !state.locating) requestPosition(); render(); }, 5000);
