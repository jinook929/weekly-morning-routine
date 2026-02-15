const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

const DEFAULT_SETTINGS = {
  musicFilePath: '',
  schedule: {
    sunday:    { enabled: false, time: '08:00' },
    monday:    { enabled: true,  time: '06:30' },
    tuesday:   { enabled: true,  time: '06:30' },
    wednesday: { enabled: true,  time: '06:30' },
    thursday:  { enabled: true,  time: '06:30' },
    friday:    { enabled: true,  time: '07:30' },
    saturday:  { enabled: false, time: '08:00' }
  }
};

function load() {
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist or is invalid — return defaults
    save(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
}

function save(settings) {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  return settings;
}

module.exports = { load, save, DEFAULT_SETTINGS };
