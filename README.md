# Weekly Morning Routine

A simple weekly alarm app that plays local music files at scheduled times via system audio. Configure your wake-up schedule through a clean browser UI, and the Node.js server handles the rest.

## Features

- Per-day alarm scheduling (enable/disable each day, set individual times)
- Native file picker to select music files (macOS & Windows)
- Playback controls: play, pause, resume, stop
- Persistent settings saved to a local JSON file
- Automatic alarm restoration on server restart

## Tech Stack

- **Backend**: Node.js + Express
- **Scheduling**: node-cron
- **Audio**: System command (`afplay` on macOS, `PowerShell MediaPlayer` on Windows)
- **Frontend**: Vanilla HTML / CSS / JS
- **Storage**: JSON file (`data/settings.json`)

## Project Structure

```
weekly-morning-routine/
├── server.js              # Express server + startup
├── lib/
│   ├── scheduler.js       # node-cron schedule management
│   ├── player.js          # System audio playback
│   └── settings.js        # JSON settings read/write
├── public/
│   ├── index.html         # Main UI
│   ├── style.css          # Styles
│   └── app.js             # Frontend logic
└── data/
    └── settings.json      # Schedule settings (auto-generated)
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- macOS or Windows

### Installation

```bash
git clone <repo-url>
cd weekly-morning-routine
npm install
```

### Running

```bash
npm start
```

Open [http://localhost:3333](http://localhost:3333) in your browser.

## Usage

1. **Set alarms** — Click a day card to enable/disable it. Click the clock icon or time to change the alarm time.
2. **Select music** — Click "Browse" to pick an audio file using the native file picker.
3. **Test playback** — Use the play/pause/stop buttons to preview your selected music.
4. **Leave running** — Keep the server running and it will play your music at the scheduled times.

## API Endpoints

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | /api/settings    | Get current settings     |
| PUT    | /api/settings    | Save settings            |
| POST   | /api/test-play   | Test play music          |
| POST   | /api/pause       | Pause playback           |
| POST   | /api/resume      | Resume playback          |
| POST   | /api/stop        | Stop playback            |
| POST   | /api/browse      | Open native file picker  |
| GET    | /api/status      | Server & schedule status |
