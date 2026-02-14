const cron = require('node-cron');
const player = require('./player');

// Map day names to cron day numbers (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_TO_CRON = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

// Active cron jobs keyed by day name
const jobs = {};

function buildCronExpression(time, dayNum) {
  const [hour, minute] = time.split(':');
  // cron format: second minute hour dayOfMonth month dayOfWeek
  return `${parseInt(minute)} ${parseInt(hour)} * * ${dayNum}`;
}

function scheduleDay(day, config, musicFilePath) {
  // Remove existing job for this day if any
  unscheduleDay(day);

  if (!config.enabled) return;

  const dayNum = DAY_TO_CRON[day];
  if (dayNum === undefined) return;

  const expression = buildCronExpression(config.time, dayNum);

  console.log(`[Scheduler] Scheduling ${day} at ${config.time} (cron: ${expression})`);

  jobs[day] = cron.schedule(expression, () => {
    console.log(`[Scheduler] Alarm triggered: ${day} ${config.time}`);
    player.play(musicFilePath).catch((err) => {
      console.error(`[Scheduler] Playback error: ${err.message}`);
    });
  });
}

function unscheduleDay(day) {
  if (jobs[day]) {
    jobs[day].stop();
    delete jobs[day];
  }
}

function scheduleAll(settings) {
  // Clear all existing jobs
  Object.keys(jobs).forEach(unscheduleDay);

  const { schedule, musicFilePath } = settings;
  for (const [day, config] of Object.entries(schedule)) {
    scheduleDay(day, config, musicFilePath);
  }

  console.log(`[Scheduler] Active alarms: ${Object.keys(jobs).join(', ') || 'none'}`);
}

function getStatus() {
  const active = {};
  for (const [day, job] of Object.entries(jobs)) {
    active[day] = true;
  }
  return active;
}

module.exports = { scheduleAll, scheduleDay, unscheduleDay, getStatus };
