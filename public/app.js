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

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// --- API ---

async function fetchSettings() {
  const res = await fetch('/api/settings');
  settings = await res.json();
  return settings;
}

async function saveSettings() {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  settings = await res.json();
  showStatus('Settings saved');
  return settings;
}

async function testPlay() {
  const res = await fetch('/api/test-play', { method: 'POST' });
  const data = await res.json();
  if (data.error) {
    showStatus('Error: ' + data.error);
  } else {
    showStatus('Playing: ' + data.file);
    document.getElementById('testPlayBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'flex';
  }
}

async function stopPlay() {
  await fetch('/api/stop', { method: 'POST' });
  showStatus('Stopped');
  document.getElementById('testPlayBtn').style.display = 'flex';
  document.getElementById('stopBtn').style.display = 'none';
}

// --- UI ---

function showStatus(msg) {
  const bar = document.getElementById('statusBar');
  bar.textContent = msg;
  setTimeout(() => {
    if (bar.textContent === msg) bar.textContent = '';
  }, 3000);
}

function renderDays() {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  DAYS.forEach(({ key, label }) => {
    const dayConfig = settings.schedule[key];
    const card = document.createElement('div');
    card.className = `day-card ${dayConfig.enabled ? 'enabled' : 'disabled'}`;

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
    });
    // Prevent card click toggle when interacting with time input
    timeInput.addEventListener('click', (e) => e.stopPropagation());

    card.appendChild(dayLabel);
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

function initFileInput() {
  const input = document.getElementById('musicFile');
  input.value = settings.musicFilePath || '';

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      settings.musicFilePath = input.value.trim();
      saveSettings();
    }, 500);
  });

  document.getElementById('testPlayBtn').addEventListener('click', testPlay);
  document.getElementById('stopBtn').addEventListener('click', stopPlay);
}

// --- Init ---

async function init() {
  await fetchSettings();
  renderDays();
  initFileInput();

  // Check playback status periodically
  setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      const status = await res.json();
      const playBtn = document.getElementById('testPlayBtn');
      const stopBtn = document.getElementById('stopBtn');
      if (status.playing) {
        playBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
      } else {
        playBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
      }
    } catch {
      // ignore
    }
  }, 5000);
}

init();
