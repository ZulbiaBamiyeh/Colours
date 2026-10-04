// Sound effects, synthesised with Web Audio: no files to load.
// The audio context starts on the first tap or key press (browsers block sound before that).
// Every sound is rate-limited so fast battles stay readable rather than noisy.

let ctx = null, master = null, noiseBuf = null;
let muted = (() => { try { return localStorage.getItem('muted') === '1'; } catch { return false; } })();
const last = {};
const VOLUME = 0.45;

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  // A gentle limiter keeps stacked sounds from clipping.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => { if (init() && ctx.state === 'suspended') ctx.resume(); }, { capture: true, passive: true });
}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('muted', m ? '1' : '0'); } catch { /* storage unavailable */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.02);
}

/* ---------- Building blocks ---------- */
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(freq, { type = 'sine', at = 0, a = 0.005, d = 0.15, vol = 0.3, to = null, detune = 0 } = {}) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
  o.detune.value = detune;
  env(g, t, a, vol, d);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + a + d + 0.05);
}
function noise({ at = 0, a = 0.003, d = 0.1, vol = 0.3, filter = 'bandpass', f = 1200, q = 1, to = null } = {}) {
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  s.loop = true;
  fl.type = filter; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + d);
  env(g, t, a, vol, d);
  s.connect(fl).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + a + d + 0.05);
}

/* ---------- The sounds ---------- */
const SOUNDS = {
  // Combat
  hit: [0.06, () => { noise({ f: 900, q: 0.8, d: 0.07, vol: 0.35 }); tone(140, { type: 'triangle', d: 0.09, vol: 0.35, to: 70 }); }],
  crit: [0.08, () => { noise({ f: 1400, q: 0.7, d: 0.1, vol: 0.45 }); tone(110, { type: 'triangle', d: 0.16, vol: 0.45, to: 50 }); tone(1500, { type: 'square', d: 0.12, vol: 0.06, to: 1900 }); }],
  block: [0.07, () => { tone(220, { type: 'triangle', d: 0.12, vol: 0.3, to: 160 }); noise({ f: 500, q: 2, d: 0.06, vol: 0.15 }); }],
  miss: [0.08, () => noise({ filter: 'highpass', f: 1800, to: 600, a: 0.02, d: 0.14, vol: 0.18 })],
  burn: [0.35, () => { noise({ filter: 'highpass', f: 2500, d: 0.05, vol: 0.08 }); noise({ filter: 'highpass', f: 3500, at: 0.04, d: 0.04, vol: 0.06 }); }],
  poison: [0.35, () => { tone(320, { d: 0.08, vol: 0.12, to: 640 }); tone(420, { at: 0.07, d: 0.07, vol: 0.09, to: 840 }); }],
  freeze: [0.2, () => { [1760, 2350, 2790, 3520].forEach((f, i) => tone(f, { at: i * 0.035, d: 0.35, vol: 0.07 })); noise({ filter: 'highpass', f: 5000, d: 0.25, vol: 0.06 }); }],
  thaw: [0.2, () => { noise({ f: 1800, q: 3, d: 0.08, vol: 0.18 }); noise({ f: 1200, q: 3, at: 0.05, d: 0.06, vol: 0.12 }); }],
  heal: [0.25, () => { tone(660, { d: 0.18, vol: 0.08 }); tone(990, { at: 0.06, d: 0.2, vol: 0.06 }); }],
  shield: [0.25, () => tone(260, { type: 'triangle', a: 0.04, d: 0.22, vol: 0.14, to: 330 })],
  thorns: [0.12, () => { tone(900, { type: 'sawtooth', d: 0.05, vol: 0.06, to: 500 }); noise({ f: 3000, q: 2, d: 0.05, vol: 0.1 }); }],
  cleanse: [0.25, () => [1568, 1319, 1047].forEach((f, i) => tone(f, { at: i * 0.05, d: 0.15, vol: 0.06 }))],
  status: [0.15, () => tone(480, { type: 'triangle', d: 0.06, vol: 0.06, to: 380 })],
  clutch: [0.5, () => { tone(80, { type: 'triangle', d: 0.3, vol: 0.4, to: 50 }); tone(440, { at: 0.05, d: 0.35, vol: 0.1, to: 880 }); }],
  fatigue: [0.6, () => noise({ filter: 'lowpass', f: 900, a: 0.05, d: 0.3, vol: 0.12 })],
  start: [1, () => { tone(98, { type: 'triangle', d: 0.35, vol: 0.4, to: 60 }); noise({ f: 300, d: 0.2, vol: 0.2 }); }],
  win: [1, () => [523, 659, 784, 1047].forEach((f, i) => { tone(f, { type: 'triangle', at: i * 0.11, d: 0.4, vol: 0.18 }); tone(f * 2, { at: i * 0.11, d: 0.3, vol: 0.04 }); })],
  loss: [1, () => [392, 349, 311, 262].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.16, d: 0.45, vol: 0.16 }))],
  draw: [1, () => [440, 440].forEach((f, i) => tone(f, { type: 'triangle', at: i * 0.2, d: 0.3, vol: 0.14 }))],
  // Trinket moments
  hourglass: [1, () => { [880, 1320, 1760].forEach((f, i) => tone(f, { at: i * 0.02, d: 1.2, vol: 0.09 })); tone(220, { type: 'triangle', d: 0.6, vol: 0.12 }); }],
  rewind: [1, () => { tone(1600, { type: 'triangle', a: 0.02, d: 0.4, vol: 0.1, to: 300 }); tone(300, { type: 'triangle', at: 0.35, d: 0.25, vol: 0.1, to: 900 }); }],
  pearl: [1, () => { noise({ filter: 'lowpass', f: 400, to: 1600, a: 0.25, d: 0.6, vol: 0.25 }); tone(330, { at: 0.2, d: 0.6, vol: 0.08 }); }],
  erupt: [1, () => { noise({ filter: 'lowpass', f: 300, a: 0.01, d: 0.7, vol: 0.55 }); tone(55, { type: 'triangle', d: 0.6, vol: 0.5, to: 35 }); noise({ filter: 'highpass', f: 2500, at: 0.1, d: 0.4, vol: 0.08 }); }],
  berserk: [1, () => { tone(90, { type: 'sawtooth', a: 0.05, d: 0.5, vol: 0.12, to: 130 }); tone(92, { type: 'sawtooth', a: 0.05, d: 0.5, vol: 0.1, to: 128, detune: 20 }); }],
  // Market
  buy: [0.05, () => { tone(1320, { type: 'square', d: 0.05, vol: 0.05 }); tone(1980, { type: 'square', at: 0.06, d: 0.09, vol: 0.05 }); }],
  sell: [0.05, () => { tone(1980, { type: 'square', d: 0.05, vol: 0.05 }); tone(1320, { type: 'square', at: 0.06, d: 0.08, vol: 0.04 }); }],
  reroll: [0.15, () => { for (let i = 0; i < 3; i++) noise({ f: 2000 + i * 600, q: 1.5, at: i * 0.05, d: 0.04, vol: 0.12 }); }],
  equip: [0.05, () => { tone(180, { type: 'triangle', d: 0.08, vol: 0.2, to: 120 }); noise({ f: 700, d: 0.04, vol: 0.08 }); }],
  socket: [0.1, () => { tone(1568, { d: 0.5, vol: 0.08 }); tone(2093, { at: 0.04, d: 0.6, vol: 0.06 }); tone(3136, { at: 0.08, d: 0.4, vol: 0.03 }); }],
  pry: [0.1, () => { noise({ f: 2500, q: 4, d: 0.06, vol: 0.15 }); tone(1200, { at: 0.04, d: 0.12, vol: 0.05, to: 800 }); }],
  error: [0.2, () => tone(180, { type: 'square', d: 0.1, vol: 0.05, to: 150 })],
};

// Play a sound by name. Quietly does nothing when muted, before the first tap, or while the tab is hidden.
export function sfx(name) {
  if (muted || !ctx || ctx.state !== 'running' || document.hidden) return;
  const s = SOUNDS[name];
  if (!s) return;
  const now = performance.now() / 1000;
  if (now - (last[name] ?? -9) < s[0]) return;
  last[name] = now;
  s[1]();
}

// The sandstorm: a looping wind whose volume follows the storm's strength (0 to 1).
let wind = null;
export function stormSound(k) {
  if (!ctx || ctx.state !== 'running') return;
  if (!wind) {
    if (k < 0.02) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
    lfo.frequency.value = 0.35; lg.gain.value = 220;
    lfo.connect(lg).connect(f.frequency);
    g.gain.value = 0;
    s.connect(f).connect(g).connect(master);
    s.start(); lfo.start();
    wind = { s, g, lfo };
  }
  wind.g.gain.setTargetAtTime(muted || document.hidden ? 0 : k * 0.28, ctx.currentTime, 0.25);
  if (k < 0.01) { const w = wind; wind = null; setTimeout(() => { w.s.stop(); w.lfo.stop(); }, 600); }
}
