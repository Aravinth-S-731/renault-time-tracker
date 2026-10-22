(function (root) {
  'use strict';

  const TARGET_MS = 8 * 60 * 60 * 1000;

  function totals(day, now = Date.now()) {
    const result = { work: 0, break: 0 };
    if (!day) return result;
    for (const session of day.sessions) {
      result[session.type] += Math.max(0, (session.end ?? now) - session.start);
    }
    return result;
  }

  function transition(days, action, now = Date.now()) {
    const next = JSON.parse(JSON.stringify(days));
    const active = next.find(day => day.end === null);
    if (action === 'start') {
      if (active) throw new Error('A day is already running.');
      next.push({ id: String(now), start: now, end: null, sessions: [{ type: 'work', start: now, end: null }] });
      return next;
    }
    if (!active) throw new Error('Start a day first.');
    const current = active.sessions[active.sessions.length - 1];
    if (now < current.start) throw new Error('Your clock moved backwards. Check your device time.');
    if (!['out', 'in', 'end'].includes(action)) throw new Error('Unknown action.');
    if (action === 'out' && current.type !== 'work') throw new Error('You are already on a break.');
    if (action === 'in' && current.type !== 'break') throw new Error('You are already working.');
    current.end = now;
    if (action === 'end') active.end = now;
    else active.sessions.push({ type: action === 'out' ? 'break' : 'work', start: now, end: null });
    return next;
  }

  function validate(days) {
    if (!Array.isArray(days)) return false;
    let activeCount = 0;
    const ids = new Set();
    const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
    for (const day of days) {
      if (!day || typeof day.id !== 'string' || ids.has(day.id) || !timestamp(day.start)) return false;
      ids.add(day.id);
      if (day.end === null) activeCount++;
      else if (!timestamp(day.end) || day.end < day.start) return false;
      if (!Array.isArray(day.sessions) || !day.sessions.length) return false;
      let cursor = day.start;
      for (let index = 0; index < day.sessions.length; index++) {
        const session = day.sessions[index];
        if (!session || session.type !== (index % 2 === 0 ? 'work' : 'break') || session.start !== cursor) return false;
        if (session.end === null) {
          if (day.end !== null || index !== day.sessions.length - 1) return false;
        } else if (!timestamp(session.end) || session.end < session.start) return false;
        cursor = session.end;
      }
      if (cursor !== day.end) return false;
    }
    const ordered = [...days].sort((first, second) => first.start - second.start);
    for (let index = 1; index < ordered.length; index++) {
      if (ordered[index - 1].end === null || ordered[index].start < ordered[index - 1].end) return false;
    }
    return activeCount <= 1;
  }

  const api = { TARGET_MS, totals, transition, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorkdayTracker = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);