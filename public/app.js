const DAYS = [
  { key: 'sunday', label: 'Sun' },
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' }
];

let settings = null;

// --- Helpers ---

function getFileName(filePath) {
  if (!filePath) return 'No file selected';
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

// --- API ---

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    settings = await res.json();
  } catch (err) {
    showStatus('Error loading settings');
  }
  return settings;
}

async function saveSettings() {
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Save failed');
    settings = await res.json();
    showStatus('Settings saved');
  } catch (err) {
    showStatus('Error saving settings');
  }
  return settings;
}

async function testPlay() {
  try {
    const res = await fetch('/api/test-play', { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      showStatus('Error: ' + data.error);
    } else {
      showStatus('Playing...', false);
      syncButtons('playing');
    }
  } catch (err) {
    showStatus('Error starting playback');
  }
}

async function pausePlay() {
  try {
    await fetch('/api/pause', { method: 'POST' });
    showStatus('Paused', false);
    syncButtons('paused');
  } catch (err) {
    showStatus('Error pausing playback');
  }
}

async function resumePlay() {
  try {
    await fetch('/api/resume', { method: 'POST' });
    showStatus('Playing...', false);
    syncButtons('playing');
  } catch (err) {
    showStatus('Error resuming playback');
  }
}

async function stopPlay() {
  try {
    await fetch('/api/stop', { method: 'POST' });
    showStatus('Stopped');
    syncButtons('idle');
  } catch (err) {
    showStatus('Error stopping playback');
  }
}

async function browseFile() {
  showStatus('Opening file picker...');
  try {
    const res = await fetch('/api/browse', { method: 'POST' });
    const data = await res.json();
    if (data.cancelled) {
      showStatus('');
      return;
    }
    settings.musicFilePath = data.filePath;
    await saveSettings();
    document.getElementById('fileName').textContent = getFileName(data.filePath);
  } catch (err) {
    showStatus('Error opening file picker');
  }
}

// --- UI ---

function syncButtons(state) {
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fileSection = document.getElementById('fileSection');

  playBtn.style.display = 'none';
  pauseBtn.style.display = 'none';
  resumeBtn.style.display = 'none';
  stopBtn.style.display = 'none';
  fileSection.classList.remove('playing', 'paused');

  if (state === 'playing') {
    pauseBtn.style.display = 'flex';
    stopBtn.style.display = 'flex';
    fileSection.classList.add('playing');
  } else if (state === 'paused') {
    resumeBtn.style.display = 'flex';
    stopBtn.style.display = 'flex';
    fileSection.classList.add('paused');
  } else {
    playBtn.style.display = 'flex';
  }
}

function showStatus(msg, autoClear = true) {
  const bar = document.getElementById('statusBar');
  bar.textContent = msg;
  if (msg && autoClear) {
    setTimeout(() => {
      if (bar.textContent === msg) bar.textContent = '';
    }, 3000);
  }
}

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')}${period}`;
}

function renderDays() {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  const today = new Date().getDay();

  DAYS.forEach(({ key, label }, index) => {
    const dayConfig = settings.schedule[key];
    const card = document.createElement('div');
    card.className = `day-card ${dayConfig.enabled ? 'enabled' : 'disabled'}`;
    if (index === today) card.classList.add('today');

    const dayLabel = document.createElement('div');
    dayLabel.className = 'day-label';
    dayLabel.textContent = label;

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'time-input';
    timeInput.value = dayConfig.time;
    timeInput.addEventListener('change', (e) => {
      settings.schedule[key].time = e.target.value;
      saveSettings();
      timeDisplay.textContent = formatTime12(e.target.value);
    });
    timeInput.addEventListener('click', (e) => e.stopPropagation());

    const clockIcon = document.createElement('div');
    clockIcon.className = 'clock-icon';
    clockIcon.textContent = '\u23F0';
    clockIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      timeInput.showPicker();
    });

    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = formatTime12(dayConfig.time);
    timeDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      timeInput.showPicker();
    });

    card.appendChild(dayLabel);
    card.appendChild(clockIcon);
    card.appendChild(timeDisplay);
    card.appendChild(timeInput);

    // Click card to toggle enabled/disabled
    card.addEventListener('click', () => {
      settings.schedule[key].enabled = !settings.schedule[key].enabled;
      saveSettings();
      renderDays();
    });

    grid.appendChild(card);
  });
}

function updateNextAlarm(activeAlarms) {
  const el = document.getElementById('nextAlarm');
  if (!settings || !activeAlarms || activeAlarms.length === 0) {
    el.textContent = 'No alarms set';
    return;
  }
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let best = null;
  DAYS.forEach(({ key, label }, index) => {
    const dayConfig = settings.schedule[key];
    if (!dayConfig.enabled) return;
    const [h, m] = dayConfig.time.split(':').map(Number);
    const alarmMinutes = h * 60 + m;
    let daysAhead = index - currentDay;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0 && alarmMinutes <= currentMinutes) daysAhead = 7;
    if (!best || daysAhead < best.daysAhead) {
      best = { label, time: formatTime12(dayConfig.time), daysAhead };
    }
  });
  el.textContent = best ? `Next alarm: ${best.label} ${best.time}` : 'No alarms set';
}

function setDaysEnabled(keys, enabled) {
  keys.forEach(k => { settings.schedule[k].enabled = enabled; });
  saveSettings();
  renderDays();
}

function initControls() {
  // File name display
  document.getElementById('fileName').textContent = getFileName(settings.musicFilePath);

  // Button handlers
  document.getElementById('browseBtn').addEventListener('click', browseFile);
  document.getElementById('playBtn').addEventListener('click', testPlay);
  document.getElementById('pauseBtn').addEventListener('click', pausePlay);
  document.getElementById('resumeBtn').addEventListener('click', resumePlay);
  document.getElementById('stopBtn').addEventListener('click', stopPlay);

  // Quick-select buttons
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekends = ['sunday', 'saturday'];
  const allDays = DAYS.map(d => d.key);

  document.getElementById('btnWeekdays').addEventListener('click', () => {
    allDays.forEach(k => { settings.schedule[k].enabled = weekdays.includes(k); });
    saveSettings(); renderDays();
  });
  document.getElementById('btnWeekends').addEventListener('click', () => {
    allDays.forEach(k => { settings.schedule[k].enabled = weekends.includes(k); });
    saveSettings(); renderDays();
  });
  document.getElementById('btnAll').addEventListener('click', () => setDaysEnabled(allDays, true));
  document.getElementById('btnNone').addEventListener('click', () => setDaysEnabled(allDays, false));
}

// --- Init ---

async function init() {
  await fetchSettings();
  renderDays();
  initControls();
  updateNextAlarm(DAYS.filter(d => settings.schedule[d.key].enabled).map(d => d.key));

  // Check playback status periodically
  setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      const status = await res.json();
      syncButtons(status.state);
      updateNextAlarm(status.activeAlarms);
    } catch {
      // ignore
    }
  }, 3000);
}

init();
