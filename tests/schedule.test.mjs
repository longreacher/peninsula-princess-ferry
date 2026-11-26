import assert from 'node:assert/strict';
import { SCHEDULES, holidayName, scheduleTypeForParts, upcomingSailings, zonedDate, nearestDirection } from '../schedule.mjs';

assert.deepEqual(
  [SCHEDULES.s2m.weekday.length, SCHEDULES.s2m.saturday.length, SCHEDULES.s2m.sunday.length],
  [37, 36, 32],
  'Summerville fall counts must include regular and reassigned island runs'
);
assert.deepEqual(
  [SCHEDULES.m2s.weekday.length, SCHEDULES.m2s.saturday.length, SCHEDULES.m2s.sunday.length],
  [37, 36, 32],
  'Millidgeville fall counts must include regular and reassigned island runs'
);
assert.equal(SCHEDULES.s2m.weekday[0], 330);
assert.equal(SCHEDULES.s2m.weekday.at(-1), 1410);
assert.equal(SCHEDULES.m2s.weekday[0], 345);
assert.equal(SCHEDULES.m2s.weekday.at(-1), 1425);
assert.equal(SCHEDULES.s2m.saturday.includes(510), true, 'Former Saturday 8:30 island run must go to Millidgeville');
assert.equal(SCHEDULES.s2m.sunday[0], 480, 'Sunday begins at 8:00 from Summerville');

const regularS2M = {
  weekday: [360,390,420,450,480,510,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410],
  saturday: [360,390,420,450,480,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410],
  sunday: [480,510,540,570,630,660,690,750,780,810,840,870,930,960,990,1020,1050,1110,1140,1170,1230,1260,1290,1350,1380,1410]
};
const reassignedS2M = {
  weekday: [330,600,720,900,1080,1200,1320],
  saturday: [510,600,720,900,1080,1200,1320],
  sunday: [600,720,900,1080,1200,1320]
};
for (const type of Object.keys(reassignedS2M)) {
  for (const time of regularS2M[type]) {
    assert.equal(SCHEDULES.s2m[type].includes(time), true, `Missing regular ${type} Summerville departure at minute ${time}`);
    assert.equal(SCHEDULES.m2s[type].includes(time + 15), true, `Missing regular ${type} Millidgeville departure at minute ${time + 15}`);
  }
  for (const time of reassignedS2M[type]) {
    assert.equal(SCHEDULES.s2m[type].includes(time), true, `Missing reassigned ${type} Summerville departure at minute ${time}`);
    assert.equal(SCHEDULES.m2s[type].includes(time + 15), true, `Missing reassigned ${type} Millidgeville departure at minute ${time + 15}`);
  }
  assert.equal(new Set(SCHEDULES.s2m[type]).size, SCHEDULES.s2m[type].length, `${type} Summerville schedule must not contain duplicates`);
  assert.equal(new Set(SCHEDULES.m2s[type]).size, SCHEDULES.m2s[type].length, `${type} Millidgeville schedule must not contain duplicates`);
}

assert.equal(holidayName(2026, 2, 16), 'Family Day');
assert.equal(holidayName(2026, 4, 3), 'Good Friday');
assert.equal(holidayName(2026, 8, 3), 'New Brunswick Day');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:3,weekday:'Mon'}), 'saturday');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:2,weekday:'Sun'}), 'sunday');
assert.equal(scheduleTypeForParts({year:2026,month:8,day:3,weekday:'Mon'}, 'weekday'), 'weekday');
assert.equal(zonedDate(2026, 11, 27, 6, 0).toISOString(), '2026-11-27T10:00:00.000Z', 'November uses Atlantic Standard Time');
assert.equal(zonedDate(2026, 7, 1, 6, 0).toISOString(), '2026-07-01T09:00:00.000Z', 'July uses Atlantic Daylight Time');

const authoritativeNow = new Date('2026-11-26T21:46:04Z');
assert.equal(upcomingSailings('s2m', authoritativeNow, 'auto', 1)[0].departure.toISOString(), '2026-11-26T22:00:00.000Z');
assert.equal(upcomingSailings('m2s', authoritativeNow, 'auto', 1)[0].departure.toISOString(), '2026-11-26T22:15:00.000Z');

const beforeFirst = zonedDate(2026, 11, 27, 5, 29);
assert.equal(upcomingSailings('s2m', beforeFirst, 'weekday', 1)[0].departure.toISOString(), zonedDate(2026,11,27,5,30).toISOString());
const afterLast = zonedDate(2026, 11, 27, 23, 31);
assert.equal(upcomingSailings('s2m', afterLast, 'auto', 1)[0].departure.toISOString(), zonedDate(2026,11,28,6,0).toISOString());
const sundayMorning = zonedDate(2026, 11, 29, 7, 0);
assert.equal(upcomingSailings('m2s', sundayMorning, 'auto', 1)[0].departure.toISOString(), zonedDate(2026,11,29,8,15).toISOString());

assert.equal(nearestDirection({lat:45.3335,lon:-66.0965}), 's2m');
assert.equal(nearestDirection({lat:45.3204,lon:-66.0818}), 'm2s');

console.log('All schedule and direction tests passed.');
