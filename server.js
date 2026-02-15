const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const settings = require('./lib/settings');
const scheduler = require('./lib/scheduler');
const player = require('./lib/player');

const app = express();
const PORT = process.env.PORT || 3333;

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

// Pause playback
app.post('/api/pause', (req, res) => {
  const paused = player.pause();
  res.json({ status: paused ? 'paused' : 'not_playing' });
});

// Resume playback
app.post('/api/resume', (req, res) => {
  const resumed = player.resume();
  res.json({ status: resumed ? 'playing' : 'not_paused' });
});

// Stop playback
app.post('/api/stop', (req, res) => {
  const stopped = player.stop();
  res.json({ status: stopped ? 'stopped' : 'not_playing' });
});

// Browse for music file (native file picker)
app.post('/api/browse', (req, res) => {
  if (process.platform === 'darwin') {
    const script = `
      set chosenFile to choose file with prompt "Select a music file" of type {"public.audio"}
      return POSIX path of chosenFile
    `;
    execFile('osascript', ['-e', script], (err, stdout) => {
      if (err) return res.json({ cancelled: true });
      res.json({ filePath: stdout.trim() });
    });
  } else if (process.platform === 'win32') {
    const psScript = [
      'Add-Type -AssemblyName System.Windows.Forms;',
      '$dialog = New-Object System.Windows.Forms.OpenFileDialog;',
      '$dialog.Title = "Select a music file";',
      '$dialog.Filter = "Audio Files|*.mp3;*.wav;*.flac;*.m4a;*.wma;*.aac;*.ogg|All Files|*.*";',
      'if ($dialog.ShowDialog() -eq "OK") { Write-Output $dialog.FileName }',
      'else { exit 1 }'
    ].join(' ');
    execFile('powershell', ['-NoProfile', '-Command', psScript], (err, stdout) => {
      if (err) return res.json({ cancelled: true });
      res.json({ filePath: stdout.trim() });
    });
  } else {
    res.status(501).json({ error: 'File picker not supported on this platform' });
  }
});

// Server & scheduler status
app.get('/api/status', (req, res) => {
  res.json({
    state: player.getState(),
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
