export const ZONE = 'America/Moncton';

const S2M = {
  weekday: [360,390,420,450,480,510,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410],
  saturday: [360,390,420,450,480,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410],
  sunday: [480,510,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410]
};

const plus15 = values => values.map(value => value + 15);

export const SCHEDULES = Object.freeze({
  s2m: Object.freeze({
    weekday: Object.freeze(S2M.weekday),
    saturday: Object.freeze(S2M.saturday),
    sunday: Object.freeze(S2M.sunday)
  }),
  m2s: Object.freeze({
    weekday: Object.freeze(plus15(S2M.weekday)),
    saturday: Object.freeze(plus15(S2M.saturday)),
    sunday: Object.freeze(plus15(S2M.sunday))
  })
});

export const DIRECTIONS = Object.freeze({
  s2m: {
    label: 'Summerville to Millidgeville',
    short: 'Summerville → Millidgeville',
    origin: 'Summerville',
    destination: 'Millidgeville',
    landing: { lat: 45.33346, lon: -66.09654 }
  },
  m2s: {
    label: 'Millidgeville to Summerville',
    short: 'Millidgeville → Summerville',
    origin: 'Millidgeville',
    destination: 'Summerville',
    landing: { lat: 45.32039, lon: -66.08181 }
  }
});

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function partsFromDate(date) {
  const raw = Object.fromEntries(dayFormatter.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    year: Number(raw.year), month: Number(raw.month), day: Number(raw.day),
    weekday: raw.weekday, hour: Number(raw.hour), minute: Number(raw.minute), second: Number(raw.second)
  };
}

function nthWeekday(year, month, weekday, occurrence) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((7 + weekday - firstWeekday) % 7) + (occurrence - 1) * 7;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function holidayName(year, month, day) {
  const md = `${month}-${day}`;
  if (md === '1-1') return "New Year's Day";
  if (month === 2 && day === nthWeekday(year, 2, 1, 3)) return 'Family Day';
  const easter = easterSunday(year);
  const goodFriday = new Date(easter.getTime() - 2 * 86400000);
  if (month === goodFriday.getUTCMonth() + 1 && day === goodFriday.getUTCDate()) return 'Good Friday';
  if (md === '7-1') return 'Canada Day';
  if (month === 8 && day === nthWeekday(year, 8, 1, 1)) return 'New Brunswick Day';
  if (month === 9 && day === nthWeekday(year, 9, 1, 1)) return 'Labour Day';
  if (md === '11-11') return 'Remembrance Day';
  if (md === '12-25') return 'Christmas Day';
  return '';
}

export function scheduleTypeForParts(parts, override = 'auto') {
  if (override !== 'auto') return override;
  if (parts.weekday === 'Sun') return 'sunday';
  if (parts.weekday === 'Sat' || holidayName(parts.year, parts.month, parts.day)) return 'saturday';
  return 'weekday';
}

function zoneOffsetAt(utcGuess) {
  const p = partsFromDate(new Date(utcGuess));
  const renderedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return renderedAsUtc - utcGuess;
}

export function zonedDate(year, month, day, hour, minute) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = utcGuess - zoneOffsetAt(utcGuess);
  result = utcGuess - zoneOffsetAt(result);
  return new Date(result);
}

function addCalendarDays(parts, number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + number));
  const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][shifted.getUTCDay()];
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), weekday };
}

export function upcomingSailings(direction, now = new Date(), override = 'auto', limit = 6) {
  const base = partsFromDate(now);
  const result = [];
  for (let dayOffset = 0; dayOffset < 4 && result.length < limit; dayOffset++) {
    const dateParts = addCalendarDays(base, dayOffset);
    const type = scheduleTypeForParts(dateParts, override);
    for (const minuteOfDay of SCHEDULES[direction][type]) {
      const departure = zonedDate(dateParts.year, dateParts.month, dateParts.day, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
      if (departure.getTime() > now.getTime()) {
        result.push({ departure, type, dayOffset, holiday: holidayName(dateParts.year, dateParts.month, dateParts.day) });
        if (result.length >= limit) break;
      }
    }
  }
  return result;
}

export function haversineKm(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

export function nearestDirection(position) {
  const s = haversineKm(position, DIRECTIONS.s2m.landing);
  const m = haversineKm(position, DIRECTIONS.m2s.landing);
  return s <= m ? 's2m' : 'm2s';
}
