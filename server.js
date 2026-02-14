const express = require('express');
const path = require('path');
const settings = require('./lib/settings');
const scheduler = require('./lib/scheduler');
const player = require('./lib/player');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// Get current settings
app.get('/api/settings', (req, res) => {
  res.json(settings.load());
});

// Save settings & reschedule
app.put('/api/settings', (req, res) => {
  const updated = settings.save(req.body);
  scheduler.scheduleAll(updated);
  res.json(updated);
});

// Test play music
app.post('/api/test-play', (req, res) => {
  const { musicFilePath } = settings.load();
  if (!musicFilePath) {
    return res.status(400).json({ error: 'No music file configured' });
  }
  player.play(musicFilePath).catch((err) => {
    console.error('[Server] Test play error:', err.message);
  });
  res.json({ status: 'playing', file: musicFilePath });
});

// Stop playback
app.post('/api/stop', (req, res) => {
  const stopped = player.stop();
  res.json({ status: stopped ? 'stopped' : 'not_playing' });
});

// Server & scheduler status
app.get('/api/status', (req, res) => {
  res.json({
    playing: player.isPlaying(),
    activeAlarms: scheduler.getStatus()
  });
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`\n  Weekly Morning Routine`);
  console.log(`  http://localhost:${PORT}\n`);

  // Load settings and schedule alarms on startup
  const current = settings.load();
  scheduler.scheduleAll(current);
});
