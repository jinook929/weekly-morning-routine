const { spawn } = require('child_process');
const path = require('path');

let currentProcess = null;

function getPlayCommand(filePath) {
  const platform = process.platform;
  if (platform === 'darwin') {
    return { cmd: 'afplay', args: [filePath] };
  } else if (platform === 'win32') {
    return {
      cmd: 'powershell',
      args: [
        '-NoProfile', '-Command',
        `Add-Type -AssemblyName PresentationCore; ` +
        `$player = New-Object System.Windows.Media.MediaPlayer; ` +
        `$player.Open([Uri]"${filePath}"); ` +
        `$player.Play(); ` +
        `Start-Sleep -Seconds 1800; ` +
        `$player.Close()`
      ]
    };
  } else {
    // Linux: try paplay (PulseAudio), fall back to aplay (ALSA)
    return { cmd: 'paplay', args: [filePath] };
  }
}

function play(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      return reject(new Error('No music file path specified'));
    }

    // Stop any currently playing audio
    stop();

    const resolved = path.resolve(filePath);
    const { cmd, args } = getPlayCommand(resolved);

    console.log(`[Player] Playing: ${resolved} (using ${cmd})`);

    currentProcess = spawn(cmd, args, { stdio: 'ignore' });

    currentProcess.on('error', (err) => {
      console.error(`[Player] Error: ${err.message}`);
      currentProcess = null;

      // On Linux, if paplay fails, try aplay
      if (process.platform === 'linux' && cmd === 'paplay') {
        console.log('[Player] Falling back to aplay...');
        currentProcess = spawn('aplay', [resolved], { stdio: 'ignore' });
        currentProcess.on('error', (err2) => {
          console.error(`[Player] aplay also failed: ${err2.message}`);
          currentProcess = null;
          reject(err2);
        });
        currentProcess.on('close', () => {
          currentProcess = null;
          resolve();
        });
      } else {
        reject(err);
      }
    });

    currentProcess.on('close', (code) => {
      currentProcess = null;
      resolve();
    });
  });
}

function stop() {
  if (currentProcess) {
    console.log('[Player] Stopping playback');
    currentProcess.kill('SIGTERM');
    currentProcess = null;
    return true;
  }
  return false;
}

function isPlaying() {
  return currentProcess !== null;
}

module.exports = { play, stop, isPlaying };
