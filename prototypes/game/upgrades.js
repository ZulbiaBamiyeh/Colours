// Gems and sockets, plus the retired scroll and cube upgrades.
// Scroll steps and cube lines are no longer sold, but Hall of Fame items kept before gems still carry them,
// stored on the instance as steps and lines, never as final numbers:
//   item.up  = { extra, used, fails, wins, st: { atk, spd, cd, hp, ward, luck, leech } }
//   item.pot = { tier: 0..3, lines: [{ k, v, s? }] }
import { ITEMS } from './items.js';

export const UPGRADE_SLOTS = { common: 2, rare: 3, epic: 4, legendary: 3 };
export const TIERS = ['Rare', 'Epic', 'Unique', 'Legendary'];
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

/* ---------------- Gems ----------------
   Gear has sockets (1 on commons, 2 on rares and up). A gem does something different in each kind of item:
   a weapon (anything that attacks), armour (helm, body, gloves, boots, cape, and offhands that don't attack)
   or jewellery (rings and the amulet). Gems are the only consumables: bought from the Jeweler, kept in the
   Use row, and set into gear. fx is read by the engine; text is what the player reads, and must match it. */
export const SOCKETS = { common: 1, rare: 2, epic: 2, legendary: 2 };
export const GEM_KINDS = { weapon: 'Weapon', armor: 'Armour', jewel: 'Jewellery' };
export function gemKind(def) {
  if (def.weapon || def.dual) return 'weapon';
  if (def.slot === 'ring' || def.slot === 'amulet') return 'jewel';
  return 'armor';
}
const every = (k, fn) => (c, info) => (info.n % k === 0 ? fn(c, info) : false);
const LIST = [
  { id: 'gem_ember', name: 'Ember', school: 'Fire', rarity: 'common', price: 2, weight: 10, color: 0xff7a2a, cut: 'round',
    text: { weapon: 'Every 3rd hit: apply 1 Burn.', armor: 'Every 3rd time you are hit: apply 1 Burn to the attacker.', jewel: 'Your Burn cap rises by 2.' },
    fx: { weapon: { hit: every(3, c => c.apply('burn', 1)) }, armor: { hooks: { whenHit: c => { c.data.k = (c.data.k ?? 0) + 1; return c.data.k % 3 === 0 && c.apply('burn', 1); } } }, jewel: { capBonus: { burn: 2 } } } },
  { id: 'gem_rime', name: 'Rime', school: 'Frost', rarity: 'common', price: 2, weight: 10, color: 0x9fe2ff, cut: 'hex',
    text: { weapon: 'On hit: apply 2 Frost.', armor: 'Every 2nd time you are hit: apply 1 Slow to the attacker.', jewel: 'Your Freezes last 1s longer.' },
    fx: { weapon: { hit: c => c.apply('frost', 2) }, armor: { hooks: { whenHit: c => { c.data.k = (c.data.k ?? 0) + 1; return c.data.k % 2 === 0 && c.apply('slow', 1); } } }, jewel: { freezeBonus: 1 } } },
  { id: 'gem_viper', name: 'Viper', school: 'Venom', rarity: 'common', price: 2, weight: 10, color: 0x8bd34a, cut: 'drop',
    text: { weapon: 'Every 3rd hit: apply 2 Poison.', armor: 'Start of fight: apply 2 Poison.', jewel: 'Your Poison cap rises by 4.' },
    fx: { weapon: { hit: every(3, c => c.apply('poison', 2)) }, armor: { start: { poison: 2 } }, jewel: { capBonus: { poison: 4 } } } },
  { id: 'gem_dune', name: 'Dune', school: 'Desert', rarity: 'common', price: 2, weight: 10, color: 0xe0b870, cut: 'oval',
    text: { weapon: 'On hit: apply 1 Sand.', armor: 'When hit: 30% chance to apply 1 Sand to the attacker.', jewel: 'Start of fight: apply 3 Sand.' },
    fx: { weapon: { hit: c => c.apply('sand', 1) }, armor: { hooks: { whenHit: c => c.chance(0.3) && c.apply('sand', 1) } }, jewel: { start: { sand: 3 } } } },
  { id: 'gem_halo', name: 'Halo', school: 'Holy', rarity: 'common', price: 2, weight: 10, color: 0xfff0a0, cut: 'round',
    text: { weapon: 'On hit: heal 1.', armor: 'Start of fight: gain 6 Shield.', jewel: 'Your healing is 15% stronger.' },
    fx: { weapon: { hit: c => c.heal(1) }, armor: { start: { shield: 6 } }, jewel: { healPct: 15 } } },
  { id: 'gem_garnet', name: 'Garnet', school: 'Blood', rarity: 'common', price: 2, weight: 10, color: 0xd8344f, cut: 'hex',
    text: { weapon: '+6% Lifesteal on this weapon.', armor: '+8 max HP.', jewel: 'Below 50% HP, your weapons deal 10% more damage.' },
    fx: { weapon: { ls: 0.06 }, armor: { hp: 8 }, jewel: { lowDmgPct: 10 } } },
  { id: 'gem_clover', name: 'Clover', school: 'Fortune', rarity: 'common', price: 2, weight: 10, color: 0x5fd08a, cut: 'oval',
    text: { weapon: '+5% crit chance on this weapon.', armor: '+2 Luck.', jewel: 'Whenever you crit, gain 1 Luck (up to 5 from this gem).' },
    fx: {
      weapon: { critBonus: 0.05 }, armor: { luck: 2 },
      jewel: { hooks: { crit: c => { if ((c.data.n ?? 0) >= 5) return false; c.data.n = (c.data.n ?? 0) + 1; return c.gain('luck', 1); } } },
    } },
  { id: 'gem_briar', name: 'Briar', school: 'Thorn', rarity: 'common', price: 2, weight: 10, color: 0xf08cb0, cut: 'drop',
    text: { weapon: 'On crit: gain 2 Thorns.', armor: 'Start of fight: gain 1 Thorns.', jewel: 'Your Thorns deal 1 more damage.' },
    fx: { weapon: { hit: (c, i) => i.crit && c.gain('thorns', 2) }, armor: { start: { thorns: 1 } }, jewel: { thornsBonus: 1 } } },
  { id: 'gem_moonstone', name: 'Moonstone', school: 'Lunar', rarity: 'common', price: 2, weight: 10, color: 0xb8c4ff, cut: 'round',
    text: { weapon: 'Your first hit: gain 1 Regen.', armor: 'Start of fight: gain 1 Regen.', jewel: 'Every 3rd time your Regen ticks, Cleanse 1.' },
    fx: {
      weapon: { hit: c => { if ((c.data.n ?? 0) >= 1) return false; c.data.n = (c.data.n ?? 0) + 1; return c.gain('regen', 1); } },
      armor: { start: { regen: 1 } },
      jewel: { hooks: { regenTick: c => { c.data.k = (c.data.k ?? 0) + 1; return c.data.k % 3 === 0 && c.cleanse(1) > 0; } } },
    } },
  { id: 'gem_echo', name: 'Echo', rarity: 'rare', price: 4, weight: 4, minDay: 2, color: 0xc58cff, cut: 'star',
    text: { weapon: "Every 3rd hit, this weapon's on-hit effects happen twice.", armor: "This item's effects have a 50% chance to happen twice.", jewel: "This item's effects have a 50% chance to happen twice." },
    fx: { weapon: { echoHits: 3 }, armor: { echo: 0.5 }, jewel: { echo: 0.5 } } },
  { id: 'gem_quicksilver', name: 'Quicksilver', rarity: 'rare', price: 4, weight: 4, minDay: 2, color: 0xe6edf5, cut: 'drop',
    text: { weapon: 'This weapon attacks 6% faster.', armor: "This item's cooldown is 25% shorter. Without one, your weapon attacks 4% faster.", jewel: "This item's cooldown is 25% shorter. Without one, your weapon attacks 4% faster." },
    fx: { weapon: { spdPct: 6 }, armor: { quick: true }, jewel: { quick: true } } },
  { id: 'gem_catalyst', name: 'Catalyst', rarity: 'rare', price: 4, weight: 4, minDay: 2, color: 0x4ad8c0, cut: 'hex',
    text: { weapon: 'Hits deal +2 damage for each different status on the enemy.', armor: 'Your weapons deal 8% more damage for each different status on you.', jewel: 'All your status caps rise by 3.' },
    fx: { weapon: { catalyst: 2 }, armor: { selfCatalyst: 8 }, jewel: { capBonus: { burn: 3, poison: 3, slow: 3, sand: 3 } } } },
  { id: 'gem_hollow', name: 'Hollow', rarity: 'common', price: 1, weight: 3, minDay: 2, color: 0x3a2050, cut: 'star', cursed: true,
    text: { weapon: 'Cursed. This weapon deals 15% more damage and its on-hit effects are 15% stronger. −10 max HP.', armor: "Cursed. This item's HP and effects are 60% stronger. −4 max HP.", jewel: "Cursed. This item's effects are 60% stronger. −3 max HP." },
    fx: { weapon: { dmgPct: 15, boost: 1.15, hp: -10 }, armor: { boost: 1.6, hp: -4 }, jewel: { boost: 1.6, hp: -3 } } },
];
export const GEMS = {};
for (const d of LIST) {
  Object.assign(d, { kind: 'gem', slot: 'use', schools: d.school ? [d.school] : [], model: { t: 'gemStone', color: d.color, cut: d.cut, cursed: !!d.cursed } });
  GEMS[d.id] = d;
}
export const USE = GEMS;
export const isUse = id => !!GEMS[id];
export const isGem = isUse;
export const gemText = (gemId, def) => GEMS[gemId].text[gemKind(def)];
export const socketsOf = item => SOCKETS[ITEMS[item.id].rarity] ?? 1;
export const gemsOf = item => (item.gems ?? []).filter(id => GEMS[id]);
export const SCHOOL_GEMS = LIST.filter(d => d.school).map(d => d.id);

export function rollUseId(day, rng, filter = () => true) {
  const pool = LIST.filter(d => (d.minDay ?? 1) <= day && filter(d));
  let r = rng() * pool.reduce((s, d) => s + d.weight, 0);
  for (const d of pool) { if ((r -= d.weight) < 0) return d.id; }
  return pool[0].id;
}

// Ghosts socket gems roughly as a player would by that day: mostly gems of their own schools, some rare ones later.
export function gemGhost(ghost, day, rng) {
  const items = Object.values(ghost.equip).filter(Boolean);
  if (!items.length) return;
  const schools = ghost.schools ?? [];
  const own = SCHOOL_GEMS.filter(id => schools.includes(GEMS[id].school));
  const rares = LIST.filter(d => d.rarity === 'rare').map(d => d.id);
  let n = Math.min(items.reduce((a, it) => a + socketsOf(it), 0), Math.round(day * 0.6));
  let guard = 60;
  while (n > 0 && guard-- > 0) {
    const it = items[Math.floor(rng() * items.length)];
    it.gems ??= [];
    if (it.gems.length >= socketsOf(it)) continue;
    const r = rng();
    const pool = day >= 3 && r < 0.25 ? rares : r < 0.3 && day >= 2 ? ['gem_hollow'] : own.length && r < 0.85 ? own : SCHOOL_GEMS;
    it.gems.push(pool[Math.floor(rng() * pool.length)]);
    n--;
  }
}

/* ---------------- Item upgrade state ---------------- */
export const slotsTotal = item => UPGRADE_SLOTS[ITEMS[item.id].rarity] + (item.up?.extra ?? 0);
export const slotsLeft = item => slotsTotal(item) - (item.up?.used ?? 0);
export const steps = item => Object.values(item.up?.st ?? {}).reduce((a, b) => a + b, 0);

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
