/* Single source of truth for audio output levels.
   Used by the asset generator, the track-gain updater and the level tests.
   html-audio.js repeats the playback gains as literals because it is a plain
   browser script; test-audio-levels.js asserts the two agree. */

// Full scale 1.0 = 0 dBFS. Effective peak = file peak x playback gain.
const dbfs = value => 20 * Math.log10(value);
const fromDb = db => Math.pow(10, db / 20);

// BGM: every track is gained to the same effective peak so stage changes do not
// jump in loudness. -17 dBFS sits mid-band in the -18..-14 dBFS target.
const BGM_TARGET_PEAK = 0.1412;
const BGM_PEAK_MIN = fromDb(-18);
const BGM_PEAK_MAX = fromDb(-14);

// SFX: all five files are normalised to one peak; relative balance is playback
// gain only, so the mix can be rebalanced without regenerating any file.
const SFX_FILE_PEAK = 0.51;
const SFX_FILE_PEAK_TOLERANCE = 0.01;
const SFX_GAIN = { coin: 0.40, orb: 0.45, death: 0.45, clear: 0.50, fever: 0.50 };

// Loudest effective SFX must land in -12..-9 dBFS; quietest no lower than -18.
const SFX_PEAK_MAX = fromDb(-9);
const SFX_PEAK_MIN = fromDb(-18);
const SFX_LOUDEST_MIN = fromDb(-12.5);

// Worst-case simultaneous mix must stay under 1.0; 0.9 is the working ceiling.
const MAX_CONCURRENT_SFX = 1;
const MIX_CEILING = 0.9;

// Per-sound retrigger guard and pool depth (see html-audio.js).
const RETRIGGER_MS = 100;
const POOL_SIZE = { coin: 0, orb: 1, death: 1, clear: 1, fever: 1 };
const EAGER_PRELOAD = ['orb'];

const effectivePeak = name => SFX_FILE_PEAK * SFX_GAIN[name];

// BGM at target plus the MAX_CONCURRENT_SFX loudest effects, peaks aligned.
function worstCaseSum() {
  const loudest = Object.keys(SFX_GAIN).map(effectivePeak).sort((a, b) => b - a);
  return BGM_TARGET_PEAK + loudest.slice(0, MAX_CONCURRENT_SFX).reduce((a, b) => a + b, 0);
}

module.exports = {
  dbfs, fromDb,
  BGM_TARGET_PEAK, BGM_PEAK_MIN, BGM_PEAK_MAX,
  SFX_FILE_PEAK, SFX_FILE_PEAK_TOLERANCE, SFX_GAIN,
  SFX_PEAK_MAX, SFX_PEAK_MIN, SFX_LOUDEST_MIN,
  MAX_CONCURRENT_SFX, MIX_CEILING, RETRIGGER_MS, POOL_SIZE, EAGER_PRELOAD,
  effectivePeak, worstCaseSum
};
