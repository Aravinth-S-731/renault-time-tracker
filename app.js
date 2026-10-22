(() => {
  'use strict';
  const { TARGET_MS, totals, transition, validate } = WorkdayTracker;
  const KEY = 'workday.v1';
  const THEME_KEY = 'workday.theme.v1';
  const element = id => document.getElementById(id);
  let days = [];
  let selectedId = null;
  let storageHealthy = true;
  let renderedSessions = '';
  let renderedHistory = '';
  const pages = { sessions: 0, history: 0 };

  function updateTabIndicator() {
    const selected = document.querySelector('.tab-bar [data-view][aria-selected="true"]');
    const indicator = element('tab-indicator');
    if (!selected || !indicator) return;
    const navBounds = selected.parentElement.getBoundingClientRect();
    const tabBounds = selected.getBoundingClientRect();
    const width = tabBounds.width * 0.38;
    const offset = tabBounds.left - navBounds.left + (tabBounds.width - width) / 2;
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translateX(${offset}px)`;
  }

  function showView(name, focus = false) {
    const tabs = [...document.querySelectorAll('[data-view]')];
    const currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    const targetIndex = tabs.findIndex(tab => tab.dataset.view === name);
    if (currentIndex >= 0 && targetIndex >= 0 && currentIndex !== targetIndex) {
      element(`${name}-view`).dataset.swipe = targetIndex > currentIndex ? 'left' : 'right';
    }
    for (const tab of tabs) {
      const selected = tab.dataset.view === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      element(`${tab.dataset.view}-view`).hidden = !selected;
      if (selected && focus) tab.focus();
    }
    updateTabIndicator();
    render();
  }

  function paginate(name, items) {
    const capacity = Math.max(1, Math.floor(element(name).clientHeight / 76));
    const count = Math.max(1, Math.ceil(items.length / capacity));
    pages[name] = Math.max(0, Math.min(pages[name], count - 1));
    element(`${name}-page`).textContent = `${pages[name] + 1} / ${count}`;
    element(`${name}-previous`).disabled = pages[name] === 0;
    element(`${name}-next`).disabled = pages[name] >= count - 1;
    return items.slice(pages[name] * capacity, (pages[name] + 1) * capacity);
  }

  function notice(message) {
    element('notice').textContent = message;
    element('notice').hidden = !message;
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    const label = `Switch to ${dark ? 'light' : 'dark'} mode`;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#161615' : '#f5f5f2';
    element('theme-toggle').setAttribute('aria-label', label);
    element('theme-toggle').setAttribute('aria-pressed', String(dark));
    element('theme-toggle').title = label;
    element('theme-toggle').innerHTML = `<svg aria-hidden="true"><use href="#${dark ? 'sun' : 'moon'}"/></svg>`;
  }

  try {
    applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
  } catch {
    applyTheme('light');
  }
  element('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  });
  function readStorage() {
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw === null ? { version: 1, days: [] } : JSON.parse(raw);
      if (data.version !== 1 || !validate(data.days)) throw new Error('Invalid saved records');
      days = data.days;
      storageHealthy = true;
    } catch {
      storageHealthy = false;
      notice('Saved records could not be read. Nothing has been overwritten. Check browser storage access or import a valid backup.');
    }
  }

  function save(next) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, days: next }));
      days = next;
      storageHealthy = true;
      notice('');
      return true;
    } catch {
      notice('This change could not be saved. Your timer has not changed. Free up browser storage or allow site data, then try again.');
      return false;
    }
  }

  function duration(milliseconds, seconds = false) {
    const total = Math.floor(Math.max(0, milliseconds) / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    if (seconds) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
  }
  const time = value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = value => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const activeDay = () => days.find(day => day.end === null);

  function render() {
    const now = Date.now();
    const active = activeDay();
    const day = days.find(entry => entry.id === selectedId) || active || days[days.length - 1];
    if (day) selectedId = day.id;
    const running = day?.end === null;
    const current = day?.sessions[day.sessions.length - 1];
    const onBreak = running && current.type === 'break';
    const sum = totals(day, now);
    const remaining = Math.max(0, TARGET_MS - sum.work);
    const complete = day && !running;
    const clock = duration(sum.work, true).split(':');
    element('work-time').innerHTML = `${clock[0]}:${clock[1]}<span>:${clock[2]}</span>`;
    element('work-time').setAttribute('aria-label', `Work time ${duration(sum.work)}`);
    element('date-label').textContent = new Date(day?.start ?? now).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    element('day-title').textContent = complete ? 'A day, well accounted for.' : onBreak ? 'A moment for yourself.' : running ? 'One thing at a time.' : 'Make time count.';
    element('status').textContent = complete ? 'Day complete' : onBreak ? 'On a break' : running ? 'Working' : 'Ready when you are';
    element('status').classList.toggle('break', Boolean(onBreak));
    element('goal-label').textContent = sum.work > TARGET_MS ? `${duration(sum.work - TARGET_MS)} overtime` : remaining === 0 ? 'Daily goal reached' : `${duration(remaining)} ${complete ? 'short of goal' : 'remaining'}`;
    element('goal-percent').textContent = `${Math.floor(sum.work / TARGET_MS * 100)}%`;
    element('progress').value = Math.min(100, sum.work / TARGET_MS * 100);
    element('started').textContent = day ? time(day.start) : '--:--';
    element('break-time').textContent = duration(sum.break);
    element('finish-label').textContent = complete ? 'FINISHED' : 'EST. FINISH';
    element('finish-time').textContent = complete ? time(day.end) : running ? time(now + remaining) : '--:--';
    element('live-label').textContent = complete ? 'Total time, including breaks' : onBreak ? `Break ${day.sessions.filter(session => session.type === 'break').length} in progress` : running ? 'Current work session' : "Your day hasn't started yet.";
    element('live-value').textContent = day ? duration(complete ? day.end - day.start : now - current.start, true) : '';
    const primary = element('primary');
    primary.classList.toggle('on-break', Boolean(onBreak));
    primary.disabled = !storageHealthy;
    primary.innerHTML = running ? onBreak ? `${icon('arrow-in')}<span>In · Back to work</span>` : `${icon('arrow-out')}<span>Out · Take a break</span>` : active ? `${icon('clock')}<span>Return to active day</span>` : `${icon('play')}<span>${day ? 'Start a new day' : 'Start day'}</span>`;
    element('end').hidden = !running;
    element('end').disabled = !storageHealthy;
    element('export').disabled = !storageHealthy || !days.length;
    renderSessions(day, now);
    renderHistory(now);
  }

  function renderSessions(day, now) {
    const sessions = day?.sessions || [];
    element('session-count').textContent = `${sessions.length} session${sessions.length === 1 ? '' : 's'}`;
    let workIndex = 0;
    let breakIndex = 0;
    const rows = sessions.map(session => {
      const isBreak = session.type === 'break';
      const index = isBreak ? ++breakIndex : ++workIndex;
      const live = session.end === null;
      const overnight = new Date(session.start).toDateString() !== new Date(session.end ?? now).toDateString();
      return `<div class="session-row"><span class="session-icon ${isBreak ? 'break' : ''}">${icon(isBreak ? 'arrow-out' : 'clock')}</span><div><div class="session-title">${isBreak ? 'Break' : 'Work session'} ${index}</div><div class="session-range">${time(session.start)} &ndash; ${live ? 'Now' : time(session.end)}${overnight ? ` (${date(session.end ?? now)})` : ''}</div></div><div class="session-duration">${duration((session.end ?? now) - session.start, live)}${live ? '<span class="session-live">In progress</span>' : ''}</div></div>`;
    });
    const markup = sessions.length ? paginate('sessions', rows).join('') : `<div class="empty"><svg class="empty-mark" aria-hidden="true"><use href="#clock"/></svg>A fresh page for your day.<br>Your work and break sessions will appear here.</div>`;
    if (!sessions.length) paginate('sessions', []);
    if (markup !== renderedSessions) {
      element('sessions').innerHTML = markup;
      renderedSessions = markup;
    }
  }

  function renderHistory(now) {
    element('history-count').textContent = `${days.length} DAY${days.length === 1 ? '' : 'S'}`;
    const markup = days.length ? paginate('history', [...days].reverse()).map(day => {
      const sum = totals(day, now);
      const selected = day.id === selectedId;
      return `<button type="button" class="history-item ${selected ? 'selected' : ''}" data-start="${day.start}" aria-pressed="${selected}"><span class="history-top"><span>${date(day.start)}</span><span class="history-state">${day.end === null ? 'Active' : sum.work >= TARGET_MS ? 'Goal met' : 'Ended'}</span></span><span class="history-bottom"><span>${duration(sum.work)} work</span><span>${duration(sum.break)} break</span></span></button>`;
    }).join('') : '<p class="empty">No days recorded yet.</p>';
    if (!days.length) paginate('history', []);
    if (markup !== renderedHistory) {
      element('history').innerHTML = markup;
      renderedHistory = markup;
    }
  }

  function act(action) {
    readStorage();
    if (!storageHealthy) return render();
    try {
      const next = transition(days, action);
      if (!validate(next)) throw new Error('The device clock conflicts with your saved day. Check the date and time before continuing.');
      if (save(next)) selectedId = next[next.length - 1].id;
    } catch (error) {
      notice(error.message);
    }
    render();
  }

  function confirmAction(title, message, label) {
    const dialog = element('confirm-dialog');
    element('confirm-title').textContent = title;
    element('confirm-message').textContent = message;
    element('confirm-accept').textContent = label;
    dialog.returnValue = 'cancel';
    dialog.showModal();
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
  }

  element('primary').addEventListener('click', () => {
    const active = activeDay();
    if (active && selectedId !== active.id) {
      selectedId = active.id;
      return render();
    }
    act(!active ? 'start' : active.sessions[active.sessions.length - 1].type === 'work' ? 'out' : 'in');
  });
  element('end').addEventListener('click', async () => {
    const day = activeDay();
    if (!day) return;
    if (await confirmAction('End your day?', `You've logged ${duration(totals(day).work)} of work. This closes your current session and saves your daily summary.`, 'End day')) act('end');
  });
  element('history').addEventListener('click', event => {
    const button = event.target.closest('[data-start]');
    if (!button) return;
    selectedId = days.find(day => day.start === Number(button.dataset.start))?.id;
    pages.sessions = 0;
    showView('timer', true);
  });
  element('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, days }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workday-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
  element('import').addEventListener('click', () => element('import-file').click());
  element('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Backup is too large. Choose a Workday JSON backup under 5 MB.');
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !validate(data.days)) throw new Error('This is not a valid Workday backup. Your current records have not changed.');
      if (await confirmAction('Restore this backup?', `Replace the records on this device with ${data.days.length} saved day(s)? Export your current records first if you need to keep them.`, 'Replace records')) {
        if (save(data.days)) {
          selectedId = null;
          notice('Backup restored.');
        }
        render();
      }
    } catch (error) {
      notice(error instanceof SyntaxError ? 'This file is not valid JSON. Your current records have not changed.' : error.message);
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) { readStorage(); render(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { readStorage(); render(); }
  });
  document.querySelector('.tab-bar').addEventListener('click', event => {
    const tab = event.target.closest('[data-view]');
    if (tab) showView(tab.dataset.view);
  });
  document.querySelector('.tab-bar').addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-view]')];
    const index = tabs.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    showView(tabs[next].dataset.view, true);
  });
  let swipeStart = null;
  const main = document.querySelector('main');
  main.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.closest('button,a,input,select,textarea,[contenteditable="true"]')) {
      swipeStart = null;
      return;
    }
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  main.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    const tabs = [...document.querySelectorAll('[data-view]')];
    const currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, currentIndex + (deltaX < 0 ? 1 : -1)));
    if (nextIndex !== currentIndex) showView(tabs[nextIndex].dataset.view);
  });
  main.addEventListener('pointercancel', () => { swipeStart = null; });
  for (const name of ['sessions', 'history']) {
    for (const direction of ['previous', 'next']) {
      element(`${name}-${direction}`).addEventListener('click', () => {
        pages[name] += direction === 'next' ? 1 : -1;
        render();
      });
    }
  }
  new ResizeObserver(() => render()).observe(document.querySelector('main'));
  window.addEventListener('resize', () => { render(); updateTabIndicator(); });
  readStorage();
  render();
  updateTabIndicator();
  setInterval(render, 1000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();