// Scrolls, cubes and potential lines (design doc section 10).
// Upgrades are stored on an item instance as steps and lines, never as final numbers,
// so they follow balance changes:
//   item.up  = { extra, used, fails, wins, st: { atk, spd, cd, hp, ward, luck, leech } }
//   item.pot = { tier: 0..3, lines: [{ k, v, s? }] }
import { ITEMS } from './items.js';

export const UPGRADE_SLOTS = { common: 2, rare: 3, epic: 4, legendary: 3 };
export const TIERS = ['Rare', 'Epic', 'Unique', 'Legendary'];
const LINE_COUNT = [1, 2, 3, 3];
const STATUS_NAMES = { burn: 'Burn', poison: 'Poison', frost: 'Frost', slow: 'Slow', sand: 'Sand' };
const pct = n => `${Math.round(n * 10) / 10}%`;

export function family(def) {
  if (def.weapon || def.dual) return 'weapon';
  if (def.slot === 'offhand') return 'offhand';
  if (def.slot === 'ring' || def.slot === 'amulet') return 'accessory';
  return 'armor';
}
export const STATS = {
  atk: { name: 'Attack', per: 'per step: +6% weapon damage', text: n => `${n >= 0 ? '+' : '−'}${pct(Math.abs(n) * 6)} weapon damage` },
  spd: { name: 'Haste', per: 'per step: −3% attack time', text: n => `${n >= 0 ? '−' : '+'}${pct(Math.abs(n) * 3)} attack time` },
  cd: { name: 'Focus', per: 'per step: −4% cooldown', text: n => `${n >= 0 ? '−' : '+'}${pct(Math.abs(n) * 4)} cooldown` },
  hp: { name: 'Vitality', per: 'per step: +5 HP', text: n => `${n >= 0 ? '+' : '−'}${Math.abs(n) * 5} HP` },
  ward: { name: 'Ward', per: 'per step: start with +4 Shield', text: n => `Start with ${n >= 0 ? '+' : '−'}${Math.abs(n) * 4} Shield` },
  luck: { name: 'Fortune', per: 'per step: +1 Luck', text: n => `${n >= 0 ? '+' : '−'}${Math.abs(n)} Luck` },
  leech: { name: 'Leech', per: 'per step: +1.5% Lifesteal', text: n => `${n >= 0 ? '+' : '−'}${pct(Math.abs(n) * 1.5)} Lifesteal` },
};
export const FAMILY_STATS = { weapon: ['atk', 'spd'], offhand: ['cd', 'hp'], armor: ['hp', 'ward'], accessory: ['luck', 'leech'] };

const LINES = {
  weapon: [
    { k: 'dmgPct', v: [4, 7, 10, 14] }, { k: 'spdPct', v: [3, 5, 7, 10] }, { k: 'ls', v: [2, 3, 5, 7] },
    { k: 'luck', v: [1, 2, 3, 4] }, { k: 'onHit', v: [null, 1, 1, 2] },
  ],
  armor: [
    { k: 'hp', v: [8, 12, 18, 25] }, { k: 'shield', v: [6, 10, 15, 22] }, { k: 'heat', v: [null, 2, 3, 4] },
    { k: 'clutchShield', v: [null, 10, 15, 22] }, { k: 'luck', v: [1, 1, 2, 3] }, { k: 'thorns', v: [2, 3, 4, 6] },
  ],
  offhand: [
    { k: 'cdPct', v: [4, 6, 9, 12] }, { k: 'hp', v: [6, 10, 14, 20] }, { k: 'shield', v: [5, 8, 12, 18] }, { k: 'luck', v: [1, 2, 2, 3] },
  ],
  accessory: [
    { k: 'luck', v: [1, 2, 3, 4] }, { k: 'ls', v: [2, 3, 4, 6] }, { k: 'hp', v: [6, 10, 14, 20] },
    { k: 'heat', v: [1, 2, 3, 4] }, { k: 'regen', v: [1, 2, 3, 4] }, { k: 'slow', v: [2, 3, 4, 6] }, { k: 'sand', v: [null, 3, 4, 6] },
  ],
};
export function lineText(l) {
  switch (l.k) {
    case 'dmgPct': return `+${l.v}% weapon damage`;
    case 'spdPct': return `−${l.v}% attack time`;
    case 'cdPct': return `−${l.v}% cooldown`;
    case 'ls': return `+${l.v}% Lifesteal`;
    case 'luck': return `+${l.v} Luck`;
    case 'hp': return `+${l.v} HP`;
    case 'shield': return `Start with ${l.v} Shield`;
    case 'heat': return `Start with ${l.v} Heat`;
    case 'thorns': return `Start with ${l.v} Thorns`;
    case 'regen': return `Start with ${l.v} Regen`;
    case 'clutchShield': return `Clutch: gain ${l.v} Shield`;
    case 'slow': return `Start: apply ${l.v} Slow`;
    case 'sand': return `Start: apply ${l.v} Sand`;
    case 'onHit': return `On hit: apply ${l.v} ${STATUS_NAMES[l.s]}`;
  }
  return l.k;
}

/* ---------------- Consumables ---------------- */
const LIST = [
  { id: 'blessed_scroll', name: 'Blessed Scroll', kind: 'scroll', odds: 1, gain: 1, price: 2, rarity: 'common', weight: 9,
    text: '100%: +1 step to a stat you choose. Uses an upgrade slot.',
    model: { t: 'scrollRoll', paper: 0xfff6dc, ink: 0x8a6a3a, ribbon: 0xf2c14e, seal: 0xffffff, glow: 0.6 } },
  { id: 'scroll', name: 'Scroll', kind: 'scroll', odds: 0.6, gain: 2, price: 3, rarity: 'common', weight: 9,
    text: '60%: +2 steps to a stat you choose. Uses an upgrade slot either way.',
    model: { t: 'scrollRoll', paper: 0xf1e2bc, ink: 0x6a4a2a, ribbon: 0x4f9de0, seal: 0xd8344f } },
  { id: 'dark_scroll', name: 'Dark Scroll', kind: 'scroll', odds: 0.3, gain: 5, destroy: 0.5, price: 4, rarity: 'rare', weight: 4,
    text: '30%: +5 steps to a stat you choose. On failure, 50% chance the item is destroyed.',
    model: { t: 'scrollRoll', paper: 0x4a3a5a, ink: 0xc58cff, ribbon: 0x1a1020, seal: 0xa25cff, glow: 0.5 } },
  { id: 'chaos_scroll', name: 'Chaos Scroll', kind: 'chaos', odds: 0.6, price: 5, rarity: 'epic', weight: 2, minDay: 3,
    text: "60%: both of the item's stats change by −2 to +4 steps. Uses an upgrade slot either way.",
    model: { t: 'scrollRoll', paper: 0xf6f0e0, ink: 0x5a4a6a, ribbon: 0xffffff, seal: 0xffffff, rainbow: true } },
  { id: 'golden_hammer', name: 'Golden Hammer', kind: 'hammer', price: 6, rarity: 'epic', weight: 2, minDay: 3,
    text: 'Adds one upgrade slot. Once per item, and it uses no slot.',
    model: { t: 'goldHammer' } },
  { id: 'plain_cube', name: 'Plain Cube', kind: 'cube', price: 3, rarity: 'common', weight: 7,
    text: "Rerolls the item's potential lines. A new item gets Rare potential. The tier never rises.",
    model: { t: 'cubeItem', a: 0x8f96a3, edge: 0xdfe4ec, core: 0xffffff } },
  { id: 'bright_cube', name: 'Bright Cube', kind: 'cube', tierUp: true, price: 5, rarity: 'rare', weight: 4,
    text: 'Rerolls potential lines, with a chance to raise the tier: Rare→Epic 10%, Epic→Unique 6%, Unique→Legendary 3%.',
    model: { t: 'cubeItem', a: 0xf2c14e, edge: 0xfff0b0, core: 0xffe27a } },
  { id: 'mirror_cube', name: 'Mirror Cube', kind: 'cube', tierUp: true, choose: true, price: 7, rarity: 'epic', weight: 2, minDay: 3,
    text: 'Like a Bright Cube, then shows the old and new lines side by side and you keep either set.',
    model: { t: 'cubeItem', a: 0xc6d0e2, edge: 0xffffff, core: 0x9fe2ff, mirror: true } },
  { id: 'lockstone', name: 'Lockstone', kind: 'lock', price: 3, rarity: 'common', weight: 3,
    text: 'In the cube window, tick a line to keep it through the next reroll. Uses one Lockstone.',
    model: { t: 'lockstone' } },
];
export const USE = {};
for (const d of LIST) { d.slot = 'use'; d.schools = []; USE[d.id] = d; }
export const isUse = id => !!USE[id];

export function rollUseId(day, rng, filter = () => true) {
  const pool = LIST.filter(d => (d.minDay ?? 1) <= day && filter(d));
  let r = rng() * pool.reduce((s, d) => s + d.weight, 0);
  for (const d of pool) { if ((r -= d.weight) < 0) return d.id; }
  return pool[0].id;
}

/* ---------------- Item upgrade state ---------------- */
export const upOf = item => (item.up ??= { extra: 0, used: 0, fails: 0, wins: 0, st: {} });
export const slotsTotal = item => UPGRADE_SLOTS[ITEMS[item.id].rarity] + (item.up?.extra ?? 0);
export const slotsLeft = item => slotsTotal(item) - (item.up?.used ?? 0);
export const steps = item => Object.values(item.up?.st ?? {}).reduce((a, b) => a + b, 0);
export const scrollChance = (item, useDef) => Math.min(1, useDef.odds + 0.05 * (item.up?.fails ?? 0));

// Apply a scroll. Returns { result: 'success' | 'fail' | 'destroy', changes }.
export function applyScroll(item, useDef, stat, rng) {
  const up = upOf(item);
  const fam = family(ITEMS[item.id]);
  const ok = rng() < scrollChance(item, useDef);
  up.used++;
  if (!ok) {
    up.fails++;
    if (useDef.destroy && rng() < useDef.destroy) return { result: 'destroy', changes: [] };
    return { result: 'fail', changes: [] };
  }
  up.fails = 0;
  up.wins++;
  const changes = [];
  if (useDef.kind === 'chaos') {
    for (const k of FAMILY_STATS[fam]) {
      const d = Math.floor(rng() * 7) - 2;
      up.st[k] = Math.max(-2, (up.st[k] ?? 0) + d);
      changes.push({ k, d });
    }
  } else {
    up.st[stat] = (up.st[stat] ?? 0) + useDef.gain;
    changes.push({ k: stat, d: useDef.gain });
  }
  return { result: 'success', changes };
}
export function applyHammer(item) {
  const up = upOf(item);
  if (up.extra) return false;
  up.extra = 1;
  return true;
}

function rollLine(fam, tier, rng) {
  const pool = LINES[fam].filter(l => l.v[tier] != null);
  const l = pool[Math.floor(rng() * pool.length)];
  const line = { k: l.k, v: l.v[tier] };
  if (l.k === 'onHit') line.s = ['burn', 'poison', 'frost', 'sand', 'slow'][Math.floor(rng() * 5)];
  return line;
}
// Roll a cube. Returns the proposed potential; commit it with item.pot = result.pot.
export function rollCube(item, useDef, rng, lockIndex = -1) {
  const fam = family(ITEMS[item.id]);
  const old = item.pot ? { tier: item.pot.tier, lines: item.pot.lines.map(l => ({ ...l })) } : null;
  let tier = old ? old.tier : 0;
  let tierUp = false;
  const upChance = [0.1, 0.06, 0.03, 0][tier];
  if (useDef.tierUp && old && rng() < upChance) { tier++; tierUp = true; }
  else if (useDef.tierUp && !old && rng() < 0.1) { tier = 1; tierUp = true; }
  const lines = [];
  for (let i = 0; i < LINE_COUNT[tier]; i++) {
    if (old && i === lockIndex && old.lines[i]) lines.push({ ...old.lines[i] });
    else lines.push(rollLine(fam, tier, rng));
  }
  return { old, pot: { tier, lines }, tierUp };
}

// Totals an item's upgrades into numbers the engine and UI use.
export function itemMods(item) {
  const m = { hp: 0, luck: 0, ls: 0, shield: 0, heat: 0, thorns: 0, regen: 0, slow: 0, sand: 0, clutchShield: 0, dmgPct: 0, spdPct: 0, cdPct: 0, onHit: [] };
  const st = item.up?.st ?? {};
  m.dmgPct += (st.atk ?? 0) * 6;
  m.spdPct += (st.spd ?? 0) * 3;
  m.cdPct += (st.cd ?? 0) * 4;
  m.hp += (st.hp ?? 0) * 5;
  m.shield += (st.ward ?? 0) * 4;
  m.luck += st.luck ?? 0;
  m.ls += (st.leech ?? 0) * 1.5;
  for (const l of item.pot?.lines ?? []) {
    if (l.k === 'onHit') m.onHit.push({ type: l.s, n: l.v });
    else m[l.k] += l.v;
  }
  m.dmgPct = Math.min(30, m.dmgPct);
  m.spdPct = Math.min(25, m.spdPct);
  m.cdPct = Math.min(25, m.cdPct);
  return m;
}
export const sellBonus = item => item.up?.wins ?? 0;

// Ghosts invest in upgrades roughly as a player would by that day.
export function upgradeGhost(ghost, day, rng) {
  const items = Object.values(ghost.equip).filter(Boolean);
  if (!items.length) return;
  // Tuned so an upgraded ghost beats its un-upgraded twin about 60-65% of the time late in a run.
  let scrollSteps = Math.floor((day - 1) * 0.5);
  let cubes = Math.floor((day - 1) / 4);
  let guard = 50;
  while (scrollSteps > 0 && guard-- > 0) {
    const it = items[Math.floor(rng() * items.length)];
    if (slotsLeft(it) <= 0) continue;
    const up = upOf(it);
    const stats = FAMILY_STATS[family(ITEMS[it.id])];
    const k = stats[Math.floor(rng() * stats.length)];
    const g = rng() < 0.4 ? 2 : 1;
    up.st[k] = (up.st[k] ?? 0) + g;
    up.used++;
    up.wins++;
    scrollSteps -= g;
  }
  while (cubes-- > 0) {
    const it = items[Math.floor(rng() * items.length)];
    const tier = rng() < Math.min(0.35, day / 35) ? Math.min(3, 1 + (rng() < day / 40 ? 1 : 0)) : 0;
    const fam = family(ITEMS[it.id]);
    it.pot = { tier, lines: Array.from({ length: LINE_COUNT[tier] }, () => rollLine(fam, tier, rng)) };
  }
}
