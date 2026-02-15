const { spawn } = require('child_process');
const path = require('path');

let currentProcess = null;
let state = 'idle'; // 'idle' | 'playing' | 'paused'

function getPlayCommand(filePath) {
  const platform = process.platform;
  if (platform === 'darwin') {
    return { cmd: 'afplay', args: [filePath] };
  } else if (platform === 'win32') {
    const psScript = [
      'Add-Type -AssemblyName PresentationCore;',
      '$player = New-Object System.Windows.Media.MediaPlayer;',
      `$player.Open([Uri]"${filePath.replace(/["`$]/g, '`$&')}");`,
      '$player.Play();',
      'while ($line = [Console]::ReadLine()) {',
      '  if ($line -eq "pause") { $player.Pause() }',
      '  elseif ($line -eq "resume") { $player.Play() }',
      '  elseif ($line -eq "stop") { $player.Stop(); $player.Close(); break }',
      '}',
      '$player.Close();'
    ].join(' ');
    return { cmd: 'powershell', args: ['-NoProfile', '-Command', psScript] };
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

    const isWin = process.platform === 'win32';
    currentProcess = spawn(cmd, args, {
      stdio: isWin ? ['pipe', 'ignore', 'ignore'] : 'ignore'
    });
    state = 'playing';

    currentProcess.on('error', (err) => {
      console.error(`[Player] Error: ${err.message}`);
      currentProcess = null;
      state = 'idle';

      // On Linux, if paplay fails, try aplay
      if (process.platform === 'linux' && cmd === 'paplay') {
        console.log('[Player] Falling back to aplay...');
        currentProcess = spawn('aplay', [resolved], { stdio: 'ignore' });
        state = 'playing';
        currentProcess.on('error', (err2) => {
          console.error(`[Player] aplay also failed: ${err2.message}`);
          currentProcess = null;
          state = 'idle';
          reject(err2);
        });
        currentProcess.on('close', () => {
          currentProcess = null;
          state = 'idle';
          resolve();
        });
      } else {
        reject(err);
      }
    });

    currentProcess.on('close', (code) => {
      currentProcess = null;
      state = 'idle';
      resolve();
    });
  });
}

function pause() {
  if (currentProcess && state === 'playing') {
    console.log('[Player] Pausing playback');
    if (process.platform === 'win32') {
      try { currentProcess.stdin.write('pause\n'); } catch (e) { return false; }
    } else {
      currentProcess.kill('SIGSTOP');
    }
    state = 'paused';
    return true;
  }
  return false;
}

function resume() {
  if (currentProcess && state === 'paused') {
    console.log('[Player] Resuming playback');
    if (process.platform === 'win32') {
      try { currentProcess.stdin.write('resume\n'); } catch (e) { return false; }
    } else {
      currentProcess.kill('SIGCONT');
    }
    state = 'playing';
    return true;
  }
  return false;
}

function stop() {
  if (currentProcess) {
    console.log('[Player] Stopping playback');
    if (process.platform === 'win32') {
      try {
        currentProcess.stdin.write('stop\n');
        currentProcess.stdin.end();
      } catch (e) {
        currentProcess.kill();
      }
    } else {
      if (state === 'paused') {
        currentProcess.kill('SIGCONT');
      }
      currentProcess.kill('SIGTERM');
    }
    currentProcess = null;
    state = 'idle';
    return true;
  }
  return false;
}

function getState() {
  return state;
}

module.exports = { play, pause, resume, stop, getState };
