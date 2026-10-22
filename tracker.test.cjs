const { test } = require('node:test');
const assert = require('node:assert/strict');
const { totals, transition, validate, TARGET_MS } = require('./tracker.js');
const hour = 3600000;

test('work excludes multiple breaks and ending creates a complete summary', () => {
  let days = transition([], 'start', 0);
  days = transition(days, 'out', 2 * hour);
  days = transition(days, 'in', 2.5 * hour);
  days = transition(days, 'out', 5 * hour);
  days = transition(days, 'in', 5.25 * hour);
  days = transition(days, 'end', 8.75 * hour);
  assert.deepEqual(totals(days[0]), { work: TARGET_MS, break: 0.75 * hour });
  assert.equal(days[0].sessions.filter(session => session.type === 'break').length, 2);
  assert.equal(validate(days), true);
});

test('reload restores an open break and ending while out closes it', () => {
  let days = transition([], 'start', 1000);
  days = transition(days, 'out', 2000);
  days = JSON.parse(JSON.stringify(days));
  assert.deepEqual(totals(days[0], 5000), { work: 1000, break: 3000 });
  days = transition(days, 'end', 6000);
  assert.deepEqual(totals(days[0], 9999), { work: 1000, break: 4000 });
  assert.equal(validate(days), true);
});

test('cross-midnight work and overtime use elapsed timestamps', () => {
  const start = new Date('2026-10-22T23:00:00Z').getTime();
  const days = transition([], 'start', start);
  assert.equal(totals(days[0], start + 9 * hour).work, 9 * hour);
  assert.equal(validate(days), true);
});

test('reject duplicate actions, backwards clocks, and invalid backups', () => {
  const days = transition([], 'start', 1000);
  assert.throws(() => transition(days, 'start', 2000));
  assert.throws(() => transition(days, 'in', 2000));
  assert.throws(() => transition(days, 'out', 500));
  assert.equal(days[0].sessions[0].end, null);
  assert.equal(validate([days[0], days[0]]), false);
  assert.equal(validate([{ ...days[0], sessions: [] }]), false);
  assert.equal(validate(null), false);
});