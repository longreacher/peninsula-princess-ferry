import assert from 'node:assert/strict';
import { SCHEDULES, holidayName, scheduleTypeForParts, upcomingSailings, zonedDate, nearestDirection } from '../schedule.mjs';

assert.deepEqual(
  [SCHEDULES.s2m.weekday.length, SCHEDULES.s2m.saturday.length, SCHEDULES.s2m.sunday.length],
  [30, 29, 26],
  'Summerville counts must match the source PDF'
);
assert.deepEqual(
  [SCHEDULES.m2s.weekday.length, SCHEDULES.m2s.saturday.length, SCHEDULES.m2s.sunday.length],
  [30, 29, 26],
  'Millidgeville counts must match the source PDF'
);
assert.equal(SCHEDULES.s2m.weekday[0], 360);
assert.equal(SCHEDULES.s2m.weekday.at(-1), 1410);
assert.equal(SCHEDULES.m2s.weekday[0], 375);
assert.equal(SCHEDULES.m2s.weekday.at(-1), 1425);
assert.equal(SCHEDULES.s2m.saturday.includes(510), false, 'Saturday has no 8:30 Summerville sailing');
assert.equal(SCHEDULES.s2m.sunday[0], 480, 'Sunday begins at 8:00 from Summerville');

assert.equal(holidayName(2026, 2, 16), 'Family Day');
assert.equal(holidayName(2026, 4, 3), 'Good Friday');
assert.equal(holidayName(2026, 8, 3), 'New Brunswick Day');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:3,weekday:'Mon'}), 'saturday');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:2,weekday:'Sun'}), 'sunday');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:3,weekday:'Mon'}, 'weekday'), 'weekday');
assert.equal(zonedDate(2026, 11, 27, 6, 0).toISOString(), '2026-11-27T10:00:00.000Z', 'November uses Atlantic Standard Time');
assert.equal(zonedDate(2026, 7, 1, 6, 0).toISOString(), '2026-07-01T09:00:00.000Z', 'July uses Atlantic Daylight Time');

const authoritativeNow = new Date('2026-11-26T21:46:04Z');
assert.equal(upcomingSailings('s2m', authoritativeNow, 'auto', 1)[0].departure.toISOString(), '2026-11-26T22:30:00.000Z');
assert.equal(upcomingSailings('m2s', authoritativeNow, 'auto', 1)[0].departure.toISOString(), '2026-11-26T22:45:00.000Z');

const beforeFirst = zonedDate(2026, 11, 27, 5, 59);
assert.equal(upcomingSailings('s2m', beforeFirst, 'weekday', 1)[0].departure.toISOString(), zonedDate(2026,11,27,6,0).toISOString());
const afterLast = zonedDate(2026, 11, 27, 23, 31);
assert.equal(upcomingSailings('s2m', afterLast, 'auto', 1)[0].departure.toISOString(), zonedDate(2026,11,28,6,0).toISOString());
const sundayMorning = zonedDate(2026, 11, 29, 7, 0);
assert.equal(upcomingSailings('m2s', sundayMorning, 'auto', 1)[0].departure.toISOString(), zonedDate(2026,11,29,8,15).toISOString());

assert.equal(nearestDirection({lat:45.3335,lon:-66.0965}), 's2m');
assert.equal(nearestDirection({lat:45.3204,lon:-66.0818}), 'm2s');

console.log('All schedule and direction tests passed.');
