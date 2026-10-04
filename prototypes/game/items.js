// Item catalog from the design doc: stats, effects (combat hooks) and model recipes.
// Effects receive a context `c` from the combat engine (see engine.js).

export const SCHOOLS = ['Fire', 'Frost', 'Venom', 'Desert', 'Holy', 'Blood', 'Fortune', 'Thorn', 'Lunar'];
export const SCHOOL_VAR = {
  Fire: '--s-fire', Frost: '--s-frost', Venom: '--s-venom', Desert: '--s-desert',
  Holy: '--s-holy', Blood: '--s-blood', Fortune: '--s-fortune', Thorn: '--s-thorn', Lunar: '--s-lunar', Prismatic: '--s-prism',
};
export const SLOTS = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
import { TRINKET_LIST } from './trinkets.js';

export const SLOT_NAME = { weapon: 'Weapon', offhand: 'Offhand', helm: 'Helm', body: 'Body', gloves: 'Gloves', boots: 'Boots', cape: 'Cape', ring1: 'Ring', ring2: 'Ring', amulet: 'Amulet', ring: 'Ring', trinket: 'Trinket', trinket1: 'Trinket', trinket2: 'Trinket' };
export const RARITY_NAME = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const PRICE = { common: 3, rare: 5, epic: 7, legendary: 10 };
const ARMOR_HP = { common: 6, rare: 10, epic: 15, legendary: 20 };
export const ARMOR_SLOTS = ['helm', 'body', 'gloves', 'boots', 'cape'];

const FIRE = 'Fire', FROST = 'Frost', VENOM = 'Venom', DESERT = 'Desert', HOLY = 'Holy', BLOOD = 'Blood', FORTUNE = 'Fortune', THORN = 'Thorn', LUNAR = 'Lunar', PRISM = 'Prismatic';
const C = 'common', R = 'rare', E = 'epic', L = 'legendary';
const W = (interval, dmg, onHit, extra = {}) => ({ interval, dmg, onHit, hands: 1, ...extra });
const W2 = (interval, dmg, onHit, extra = {}) => W(interval, dmg, onHit, { hands: 2, ...extra });

const LIST = [
  /* ---------------- Fire ---------------- */
  { id: 'cinder_knife', name: 'Cinder Knife', schools: [FIRE], slot: 'weapon', rarity: C, kind: 'Dagger',
    text: 'On hit: apply 1 Burn.', weapon: W(1.2, 3, c => c.apply('burn', 1)),
    model: { t: 'cinder', hand: -0.24, hold: 0.85 } },
  { id: 'sunbrand', name: 'Sunbrand', schools: [FIRE], slot: 'weapon', rarity: R, kind: 'Greatsword',
    text: 'On hit: apply 2 Burn and gain 2 Heat.', weapon: W2(4.0, 20, c => { c.apply('burn', 2); c.gain('heat', 2); }),
    model: { t: 'sword', len: 1.85, w: 0.15, blade: 0x5a4f5a, edge: 0xff7a2a, glow: 0.6, fuller: 0xffb04a, guard: 0x8a4b22, guardW: 0.72, tips: 0xff8a2a, grip: 0x5c2d1c, gem: 0xffa31a, gemGlow: 0.9, hilt: 0.55, hand: -0.3, hold: 0.55 } },
  { id: 'ember_censer', name: 'Ember Censer', schools: [FIRE], slot: 'offhand', rarity: C, kind: 'Censer',
    text: 'Every 4s: apply 2 Burn.', cd: 4, act: c => c.apply('burn', 2),
    model: { t: 'censer', a: 0x7d401b, b: 0xc48a24, glow: 0xff8a2a, hold: 0.45, grip: 1.0 } },
  { id: 'kindled_brazier', name: 'Kindled Brazier', schools: [FIRE], slot: 'offhand', rarity: R, kind: 'Brazier',
    text: 'Every 4s: gain 2 Heat.', cd: 4, act: c => c.gain('heat', 2),
    model: { t: 'brazier', a: 0x4a3a34, b: 0x2a201c, hold: 0.4, grip: -0.02 } },
  { id: 'pyromancers_hood', name: "Pyromancer's Hood", schools: [FIRE], slot: 'helm', rarity: R,
    text: 'While the enemy has 5+ Burn, Burn you apply +1.',
    mods: { applyN: (c, n, o) => (o.type === 'burn' && c.foe.st.burn >= 5 ? n + 1 : n) },
    model: { t: 'hood', a: 0x9b2f1e, b: 0xe0a040, lining: 0x4a1a10, gem: 0xffa31a, wear: { y: -0.01, s: 0.96 } } },
  { id: 'ember_ward', name: 'Ember Ward', schools: [FIRE], slot: 'body', rarity: C,
    text: 'When hit: apply 1 Burn to the attacker.', hooks: { whenHit: c => c.apply('burn', 1) },
    model: { t: 'armor', kind: 'plate', a: 0x4a3a34, b: 0x7d401b, c: 0xe0a040, flame: true, tint: 0x6a3a2a } },
  { id: 'stoked_gauntlets', name: 'Stoked Gauntlets', schools: [FIRE], slot: 'gloves', rarity: R,
    text: 'On crit: apply 2 Burn and gain 1 Heat.', hooks: { crit: c => { c.apply('burn', 2); return c.gain('heat', 1); } },
    model: { t: 'glove', a: 0x3a2a22, b: 0x5c2d1c, knuckle: 0xff8a2a, knuckleGlow: 0.9 } },
  { id: 'firewalkers', name: 'Firewalkers', schools: [FIRE], slot: 'boots', rarity: C,
    text: 'Start of fight: gain 4 Heat.', hooks: { start: c => c.gain('heat', 4) },
    model: { t: 'boot', a: 0x5c2d1c, b: 0x2a1a12, extra: 'flames' } },
  { id: 'phoenix_cloak', name: 'Phoenix Cloak', schools: [FIRE], slot: 'cape', rarity: E,
    text: 'Clutch: apply 5 Burn and gain 4 Heat.', hooks: { clutch: c => { c.apply('burn', 5); return c.gain('heat', 4); } },
    model: { t: 'cape', a: 0xc0392b, b: 0x3a1a12, hem: 0xff9a2a, hemGlow: 0.6, emblem: 'flame' } },
  { id: 'ashen_ring', name: 'Ashen Ring', schools: [FIRE], slot: 'ring', rarity: R,
    text: 'Burn ticks deal +1 damage per 5 Heat you have.', flags: { ashen: true },
    model: { t: 'ring', band: 0x47414f, gem: 0xff5320, deco: 'flame' } },
  { id: 'wildfire', name: 'Wildfire', schools: [FIRE], slot: 'amulet', rarity: L,
    text: 'Your Burn cap rises from 8 to 16. While you have 8+ Heat, your Burn deals 25% more damage.', flags: { wildfire: true },
    model: { t: 'amulet', shape: 'flame' } },
  { id: 'molten_core', name: 'Molten Core', schools: [FIRE], slot: 'amulet', rarity: L,
    text: 'Heat has no cap. Weapon hits deal +10% damage per 5 Heat. You lose 1 HP per second per 10 Heat.', flags: { molten: true },
    mods: { hitDmg: (c, d) => d * (1 + 0.1 * Math.floor(c.me.heat / 5)) },
    hooks: { second: c => { const n = Math.floor(c.me.heat / 10); return n > 0 && c.selfDamage(n); } },
    model: { t: 'amulet', shape: 'core' } },

  /* ---------------- Frost ---------------- */
  { id: 'rimed_saber', name: 'Rimed Saber', schools: [FROST], slot: 'weapon', rarity: C, kind: 'Sword',
    text: 'On hit: apply 3 Frost.', weapon: W(2.2, 8, c => c.apply('frost', 3)),
    model: { t: 'sword', blade: 0x9fb4cc, edge: 0x7fd6ff, glow: 0.4, guard: 0x6a7a99, grip: 0x2c3a52, gem: 0x7fd6ff, frost: 0xccf5ff, hold: 0.75 } },
  { id: 'glacier_maul', name: 'Glacier Maul', schools: [FROST], slot: 'weapon', rarity: R, kind: 'Maul',
    text: 'On hit: apply 3 Frost and 2 Slow.', weapon: W2(4.5, 26, c => { c.apply('frost', 3); c.apply('slow', 2); }),
    model: { t: 'maul', hand: -0.8, hold: 0.6 } },
  { id: 'frost_lantern', name: 'Frost Lantern', schools: [FROST], slot: 'offhand', rarity: C, kind: 'Lantern',
    text: 'Every 2.5s: apply 4 Frost.', cd: 2.5, act: c => c.apply('frost', 4),
    model: { t: 'lantern', a: 0x6a7a99, b: 0xccf5ff, glow: 0x7fd6ff, hold: 0.45, grip: 0.66 } },
  { id: 'winters_bell', name: "Winter's Bell", schools: [FROST], slot: 'offhand', rarity: C, kind: 'Bell',
    text: 'Every 4s: apply 4 Slow.', cd: 4, act: c => c.apply('slow', 4),
    model: { t: 'bell', a: 0x9fd0ea, b: 0xe8fbff, hold: 0.45, grip: 0.74 } },
  { id: 'rimecrown', name: 'Rimecrown', schools: [FROST], slot: 'helm', rarity: R,
    text: 'While the enemy is Frozen, your weapons deal +40% damage.',
    mods: { hitDmg: (c, d) => (c.foe.frozen > 0 ? d * 1.4 : d) },
    model: { t: 'crown', a: 0xc6d0e2, b: 0xbdf0ff, c: 0x4fb2e8, wear: { y: 0.3, s: 0.82 } } },
  { id: 'glacial_plate', name: 'Glacial Plate', schools: [FROST], slot: 'body', rarity: C,
    text: 'When hit: apply 2 Frost and 1 Slow to the attacker.', hooks: { whenHit: c => { c.apply('frost', 2); return c.apply('slow', 1); } },
    model: { t: 'armor', kind: 'plate', a: 0x8aa6c4, b: 0xd8eef8, snow: 0xccf5ff } },
  { id: 'frostbite_grips', name: 'Frostbite Grips', schools: [FROST], slot: 'gloves', rarity: R,
    text: 'On crit: apply 3 Frost.', hooks: { crit: c => c.apply('frost', 3) },
    model: { t: 'glove', a: 0x6a8fb4, b: 0x3c5a7a, frost: 0xccf5ff } },
  { id: 'snowtread_boots', name: 'Snowtread Boots', schools: [FROST], slot: 'boots', rarity: C,
    text: 'Start of fight: apply 8 Slow.', hooks: { start: c => c.apply('slow', 8) },
    model: { t: 'boot', a: 0x5a7aa0, b: 0xe8eef4, extra: 'fur' } },
  { id: 'winters_shroud', name: "Winter's Shroud", schools: [FROST], slot: 'cape', rarity: E,
    text: 'Clutch: Freeze the enemy for 3s, ignoring Thaw.', hooks: { clutch: c => c.freeze(3) },
    model: { t: 'cape', a: 0xe8eef4, b: 0x3c6c9a, hem: 0x9fd0ea, emblem: 'snow' } },
  { id: 'rimeheart_ring', name: 'Rimeheart Ring', schools: [FROST], slot: 'ring', rarity: R,
    text: 'Whenever the enemy Freezes, apply 5 Slow.', hooks: { enemyFreeze: c => c.apply('slow', 5) },
    model: { t: 'ring', band: 0xc6d0e2, gem: 0x7fd6ff, shape: 'heart', deco: 'spikes' } },
  { id: 'heart_of_winter', name: 'Heart of Winter', schools: [FROST], slot: 'amulet', rarity: L,
    text: 'Whenever the enemy Freezes, consume all their Slow and deal 4 damage per stack.',
    hooks: { enemyFreezeFirst: c => { const n = c.foe.st.slow; if (!n) return false; c.foe.st.slow = 0; return c.hit(n * 4); } },
    model: { t: 'amulet', shape: 'snowflake' } },

  /* ---------------- Venom ---------------- */
  { id: 'asp_fang', name: 'Asp Fang', schools: [VENOM], slot: 'weapon', rarity: C, kind: 'Dagger',
    text: 'On hit: apply 1 Poison.', weapon: W(1.2, 3, c => c.apply('poison', 1)),
    model: { t: 'dagger', blade: 0x3f5a2e, edge: 0x8bd34a, guard: 0x2e3a22, grip: 0x2e3a22, gem: 0x8bd34a, drip: 0x8bd34a, hold: 0.85 } },
  { id: 'blightreaper', name: 'Blightreaper', schools: [VENOM], slot: 'weapon', rarity: R, kind: 'Scythe',
    text: 'On hit: apply 6 Poison.', weapon: W2(4.0, 18, c => c.apply('poison', 6)),
    model: { t: 'scythe', haft: 0x3a2e22, blade: 0x4a5a3a, edge: 0x8bd34a, bone: 0xd8d0b0, hand: -0.5, hold: 0.6 } },
  { id: 'stinger', name: 'Stinger', schools: [VENOM], slot: 'offhand', rarity: C, kind: 'Parrying dagger',
    text: 'Dual wield: attacks every 1.5s for 2. On hit: apply 1 Poison.', dual: W(1.5, 2, c => c.apply('poison', 1)),
    model: { t: 'dagger', len: 0.9, curve: 0.08, blade: 0x5a6a3a, edge: 0xb8e070, guard: 0x2e3a22, grip: 0x2e3a22, gem: 0x8bd34a } },
  { id: 'plague_mask', name: 'Plague Mask', schools: [VENOM], slot: 'helm', rarity: R,
    text: 'While the enemy has 10+ Poison, your weapon hits apply +1 Poison.',
    hooks: { hit: c => c.foe.st.poison >= 10 && c.apply('poison', 1) },
    model: { t: 'mask', a: 0x2e3a22, b: 0xd8d0b0, c: 0x8bd34a, trim: 0x6a5a3a, hat: 0x1e2418, wear: { y: 0.02, s: 0.84 } } },
  { id: 'venom_carapace', name: 'Venom Carapace', schools: [VENOM], slot: 'body', rarity: C,
    text: 'When hit: apply 1 Poison to the attacker.', hooks: { whenHit: c => c.apply('poison', 1) },
    model: { t: 'armor', kind: 'carapace', a: 0x3f5a2e, b: 0x6a8a3a, c: 0xd8d0b0 } },
  { id: 'envenomed_gloves', name: 'Envenomed Gloves', schools: [VENOM], slot: 'gloves', rarity: R,
    text: 'On crit: apply 3 Poison.', hooks: { crit: c => c.apply('poison', 3) },
    model: { t: 'glove', a: 0x3f5a2e, b: 0x2e3a22, drip: 0x8bd34a, claws: 0xd8d0b0 } },
  { id: 'mire_boots', name: 'Mire Boots', schools: [VENOM], slot: 'boots', rarity: C,
    text: 'Start of fight: apply 3 Poison.', hooks: { start: c => c.apply('poison', 3) },
    model: { t: 'boot', a: 0x3f4a2a, b: 0x2a3020, c: 0x8bd34a, extra: 'drips' } },
  { id: 'festering_ring', name: 'Festering Ring', schools: [VENOM], slot: 'ring', rarity: R,
    text: 'Whenever Poison ticks: 25% chance to apply 1 Poison.', hooks: { poisonTick: c => c.chance(0.25) && c.apply('poison', 1) },
    model: { t: 'ring', band: 0x3f5a2e, gem: 0x8bd34a, shape: 'sphere', deco: 'drop' } },
  { id: 'coiled_serpent', name: 'Coiled Serpent', schools: [VENOM], slot: 'amulet', rarity: L,
    text: 'Every 5th Poison tick also strikes for 5× current stacks. The strike can crit.', flags: { serpent: true },
    model: { t: 'amulet', shape: 'serpent' } },

  /* ---------------- Desert ---------------- */
  { id: 'dune_scimitar', name: 'Dune Scimitar', schools: [DESERT], slot: 'weapon', rarity: C, kind: 'Scimitar',
    text: 'On hit: apply 2 Sand.', weapon: W(2.0, 6, c => c.apply('sand', 2)),
    model: { t: 'sword', curve: 0.14, blade: 0xd8d0c0, guard: 0xc48a24, grip: 0x6a4424, gem: 0xe8c27a, hold: 0.75 } },
  { id: 'sandstorm_glaive', name: 'Sandstorm Glaive', schools: [DESERT], slot: 'weapon', rarity: R, kind: 'Glaive',
    text: 'On hit: apply 4 Sand.', weapon: W2(3.5, 18, c => c.apply('sand', 4)),
    model: { t: 'glaive', haft: 0x6a4424, blade: 0xd8d0c0, trim: 0xc48a24, tassel: 0xc0392b, gem: 0xe8c27a, hand: -0.5, hold: 0.58 } },
  { id: 'sand_pouch', name: 'Sand Pouch', schools: [DESERT], slot: 'offhand', rarity: C, kind: 'Pouch',
    text: 'Every 3s: apply 3 Sand.', cd: 3, act: c => c.apply('sand', 3),
    model: { t: 'pouch', a: 0xb08a5a, b: 0x6a4424, c: 0xdbb470, hold: 0.45, grip: 0.46 } },
  { id: 'nomads_wrap', name: "Nomad's Wrap", schools: [DESERT], slot: 'helm', rarity: R,
    text: 'While the enemy has 10+ Sand, their weapon hits deal 15% less damage.', flags: { sandTax: true },
    model: { t: 'wrap', a: 0xe8d8b0, b: 0xc0392b, c: 0x4fb2e8, wear: { y: 0.06, s: 0.82 } } },
  { id: 'dustveil_robe', name: 'Dustveil Robe', schools: [DESERT], slot: 'body', rarity: C,
    text: 'When hit: apply 3 Sand to the attacker.', hooks: { whenHit: c => c.apply('sand', 3) },
    model: { t: 'armor', kind: 'robe', a: 0xd9b77e, b: 0x8a5a2b } },
  { id: 'grit_gloves', name: 'Grit Gloves', schools: [DESERT], slot: 'gloves', rarity: R,
    text: 'On crit: apply 4 Sand.', hooks: { crit: c => c.apply('sand', 4) },
    model: { t: 'glove', a: 0xb08a5a, b: 0x6a4424, wraps: 0xe8d8b0 } },
  { id: 'dust_devils', name: 'Dust Devils', schools: [DESERT], slot: 'boots', rarity: C,
    text: 'Start of fight: apply 8 Sand.', hooks: { start: c => c.apply('sand', 8) },
    model: { t: 'boot', a: 0xb08a5a, b: 0x6a4424, c: 0xdbb470, extra: 'swirl' } },
  { id: 'sirocco_cloak', name: 'Sirocco Cloak', schools: [DESERT], slot: 'cape', rarity: E,
    text: "Clutch: set the enemy's Sand to its cap.",
    hooks: { clutch: c => c.apply('sand', 15) },
    model: { t: 'cape', a: 0xd9b77e, b: 0x8a5a2b, trim: 0xc48a24, emblem: 'swirl' } },
  { id: 'dune_ring', name: 'Dune Ring', schools: [DESERT], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses: apply 1 Sand.', hooks: { enemyMiss: c => c.apply('sand', 1) },
    model: { t: 'ring', band: 0xc48a24, gem: 0xe8c27a, deco: 'sand' } },
  { id: 'mirage', name: 'Mirage', schools: [DESERT], slot: 'amulet', rarity: L,
    text: 'Enemy attacks that miss hit the enemy instead, with their own on-hit effects.', flags: { mirage: true },
    model: { t: 'amulet', shape: 'eye' } },

  /* ---------------- Holy ---------------- */
  { id: 'wardens_mace', name: "Warden's Mace", schools: [HOLY], slot: 'weapon', rarity: C, kind: 'Mace',
    text: 'On hit: gain 6 Shield.', weapon: W(3.0, 10, c => c.gain('shield', 6)),
    model: { t: 'mace', haft: 0x6a5a4a, head: 0xc6d0e2, flange: 0xe8b73a, gem: 0x7fd0ff, hand: -0.38, hold: 0.8 } },
  { id: 'dawnhammer', name: 'Dawnhammer', schools: [HOLY], slot: 'weapon', rarity: R, kind: 'Hammer',
    text: 'On hit: heal 8 and gain 8 Shield.', weapon: W2(4.5, 22, c => { c.heal(8); c.gain('shield', 8); }),
    model: { t: 'hammer', haft: 0x8a6a3a, head: 0xf3eedc, face: 0xe8b73a, hand: -0.8, hold: 0.58 } },
  { id: 'oak_buckler', name: 'Oak Buckler', schools: [HOLY], slot: 'offhand', rarity: C, kind: 'Shield',
    text: 'Every 4s: gain 10 Shield.', cd: 4, act: c => c.gain('shield', 10),
    model: { t: 'buckler', a: 0x8a5a2b, b: 0xc6d0e2, c: 0xe8b73a, hold: 0.42 } },
  { id: 'hymnal', name: 'Hymnal', schools: [HOLY], slot: 'offhand', rarity: C, kind: 'Tome',
    text: 'Every 5s: heal 12.', cd: 5, act: c => c.heal(12),
    model: { t: 'tome', a: 0xf3eedc, b: 0xe8b73a, c: 0xf2d67c, hold: 0.38 } },
  { id: 'gilded_halo', name: 'Gilded Halo', schools: [HOLY], slot: 'helm', rarity: R,
    text: 'While you have Shield, your heals are 25% stronger.', mods: { heal: (c, n) => (c.me.shield > 0 ? n * 1.25 : n) },
    model: { t: 'haloHelm', wear: { y: 0.06, s: 0.78 } } },
  { id: 'bastion_plate', name: 'Bastion Plate', schools: [HOLY], slot: 'body', rarity: C,
    text: 'When hit: gain 4 Shield.', hooks: { whenHit: c => c.gain('shield', 4) },
    model: { t: 'armor', kind: 'plate', a: 0xf3eedc, b: 0xe8b73a, emblem: 0x7fd0ff } },
  { id: 'mending_gloves', name: 'Mending Gloves', schools: [HOLY], slot: 'gloves', rarity: R,
    text: 'On crit: heal 5.', hooks: { crit: c => c.heal(5) },
    model: { t: 'glove', a: 0xf6f0e0, b: 0xe8b73a, sun: 0xf2d67c } },
  { id: 'pilgrims_sandals', name: "Pilgrim's Sandals", schools: [HOLY], slot: 'boots', rarity: C,
    text: 'Start of fight: gain 20 Shield.', hooks: { start: c => c.gain('shield', 20) },
    model: { t: 'boot', sandal: true, a: 0x8a5a2b, b: 0x5c3a1c, c: 0xe8b73a, wrap: 0xe8dcc0, tint: 0xd8c8a0, extra: 'wings' } },
  { id: 'guardians_mantle', name: "Guardian's Mantle", schools: [HOLY], slot: 'cape', rarity: E,
    text: 'Clutch: gain Shield equal to 40% of your max HP.', hooks: { clutch: c => c.gain('shield', c.me.maxHp * 0.4) },
    model: { t: 'cape', a: 0xf6f0e0, b: 0xe8b73a, hem: 0xe8b73a, emblem: 'sun' } },
  { id: 'sanctified_vessel', name: 'Sanctified Vessel', schools: [HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you overheal, gain that much Shield.', hooks: { overheal: (c, o) => c.gain('shield', o.over) },
    model: { t: 'ring', band: 0xe8b73a, gem: 0xf2d67c, shape: 'sphere', deco: 'vessel' } },
  { id: 'reliquary', name: 'Reliquary of Saints', schools: [HOLY], slot: 'amulet', rarity: L,
    text: 'Overhealing raises your max HP for the rest of the fight.', flags: { reliquary: true },
    model: { t: 'amulet', shape: 'reliquary' } },
  { id: 'juggernauts_oath', name: "Juggernaut's Oath", schools: [HOLY], slot: 'amulet', rarity: L,
    text: 'Weapon hits deal bonus damage equal to 25% of your current Shield.', flags: { juggernaut: true },
    model: { t: 'amulet', shape: 'shield' } },

  /* ---------------- Blood ---------------- */
  { id: 'bloodletter', name: 'Bloodletter', schools: [BLOOD], slot: 'weapon', rarity: C, kind: 'Axe',
    text: '35% Lifesteal.', weapon: W(2.8, 11, null, { ls: 0.35 }),
    model: { t: 'axe', haft: 0x3a2418, blade: 0x8a8f9a, edge: 0xd8344f, socket: 0x2a1a1e, gem: 0xd8344f, hand: -0.4, hold: 0.68 } },
  { id: 'crimson_greataxe', name: 'Crimson Greataxe', schools: [BLOOD], slot: 'weapon', rarity: R, kind: 'Greataxe',
    text: '40% Lifesteal.', weapon: W2(4.5, 28, null, { ls: 0.4 }),
    model: { t: 'axe', two: true, double: true, haft: 0x2a1a1e, blade: 0x6b1a24, edge: 0xd8344f, socket: 0x1a1014, gem: 0xd8344f, hand: -0.72, hold: 0.58 } },
  { id: 'sacrificial_dirk', name: 'Sacrificial Dirk', schools: [BLOOD], slot: 'offhand', rarity: C, kind: 'Ritual dagger',
    text: 'Dual wield: attacks every 1.6s for 4, with 40% Lifesteal.', dual: W(1.6, 4, null, { ls: 0.4 }),
    model: { t: 'dagger', len: 0.95, blade: 0x8a1a2a, edge: 0xff5a6a, guard: 0x2a1a1e, grip: 0x2a1a1e, gem: 0xd8344f } },
  { id: 'vampires_cowl', name: "Vampire's Cowl", schools: [BLOOD], slot: 'helm', rarity: R,
    text: 'While below 50% HP: +15% Lifesteal.', mods: { lifesteal: (c, v) => (c.me.hp < c.me.maxHp * 0.5 ? v + 0.15 : v) },
    model: { t: 'hood', a: 0x2a1a1e, b: 0xb02a3a, lining: 0x6b1a24, collar: 0x6b1a24, wear: { y: -0.01, s: 0.96 } } },
  { id: 'bloodbound_mail', name: 'Bloodbound Mail', schools: [BLOOD], slot: 'body', rarity: R,
    text: 'When hit: gain 3% Lifesteal for the rest of the fight (max +30%).',
    hooks: { whenHit: c => { if ((c.data.ls ?? 0) >= 0.3) return false; c.data.ls = Math.min(0.3, (c.data.ls ?? 0) + 0.03); return true; } },
    mods: { lifesteal: (c, v) => v + (c.data.ls ?? 0) },
    model: { t: 'armor', kind: 'mail', a: 0x6b1a24, b: 0x3a2a2e } },
  { id: 'bloodied_knuckles', name: 'Bloodied Knuckles', schools: [BLOOD], slot: 'gloves', rarity: R,
    text: "On crit: that hit's Lifesteal is doubled.", flags: { knuckles: true },
    model: { t: 'glove', a: 0x6b1a24, b: 0x2a1a1e, knuckle: 0xd8d0c0, spike: true, knuckleGlow: 0 } },
  { id: 'blood_price', name: 'Blood Price', schools: [BLOOD], slot: 'boots', rarity: C,
    text: 'Start of fight: lose 10 HP. Your first 5 weapon hits have 100% Lifesteal.',
    hooks: { start: c => { c.selfDamage(10); c.me.fullLs += 5; return true; } },
    model: { t: 'boot', a: 0x6b1a24, b: 0x2a1a1e, c: 0xd8d0c0, extra: 'spikes' } },
  { id: 'blood_moon_cloak', name: 'Blood Moon Cloak', schools: [BLOOD], slot: 'cape', rarity: E,
    text: 'Weapon hits deal +2 damage. Clutch: your next 3 weapon hits have 100% Lifesteal.',
    mods: { hitDmg: (c, d) => d + 2 },
    hooks: { clutch: c => { c.me.fullLs += 3; return true; } },
    model: { t: 'cape', a: 0x3a1018, b: 0x1a0a0e, hem: 0x8a1a2a, emblem: 'moon' } },
  { id: 'sanguine_ring', name: 'Sanguine Ring', schools: [BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever you Lifesteal at full HP, deal the overheal to the enemy as damage.',
    hooks: { overheal: (c, o) => o.ls && c.hit(o.over) },
    model: { t: 'ring', band: 0x2a1a1e, gem: 0xd8344f, deco: 'fangs' } },
  { id: 'crimson_chalice', name: 'Crimson Chalice', schools: [BLOOD], slot: 'amulet', rarity: L,
    text: 'Lifesteal applies to all damage you deal, including Burn, Poison and reflected hits.', flags: { chalice: true },
    model: { t: 'amulet', shape: 'chalice' } },

  /* ---------------- Fortune ---------------- */
  { id: 'fortunes_edge', name: "Fortune's Edge", schools: [FORTUNE], slot: 'weapon', rarity: C, kind: 'Rapier',
    text: 'On hit: 30% chance to gain 1 Luck.', weapon: W(1.4, 6, c => c.chance(0.3) && c.gain('luck', 1)),
    model: { t: 'sword', rapier: true, len: 1.4, w: 0.04, blade: 0xd8dce4, guard: 0xe8b73a, grip: 0x24684c, gem: 0x4fc79c, hold: 0.75 } },
  { id: 'jackpot_cleaver', name: 'Jackpot Cleaver', schools: [FORTUNE], slot: 'weapon', rarity: R, kind: 'Cleaver',
    text: 'On hit: gain 1 Luck. Its crits deal 3×.', weapon: W2(4.0, 20, c => c.gain('luck', 1), { critMult: 3 }),
    model: { t: 'cleaver', haft: 0x24543e, blade: 0x9aa6b8, edge: 0xd8dce4, coin: 0xf2c14e, clover: 0x2f8a63, hand: -0.6, hold: 0.6 } },
  { id: 'lucky_coin', name: 'Lucky Coin', schools: [FORTUNE], slot: 'offhand', rarity: C, kind: 'Coin',
    text: 'Every 2s: 60% chance to gain 1 Luck.', cd: 2, act: c => c.chance(0.6) && c.gain('luck', 1),
    model: { t: 'coin', a: 0xf2c14e, b: 0xc98f1e, c: 0x2f8a63, hold: 0.4 } },
  { id: 'gamblers_hood', name: "Gambler's Hood", schools: [FORTUNE], slot: 'helm', rarity: R,
    text: '+5 Luck. While you have 10+ Luck, crits deal 2.5×.', stats: { luck: 5 },
    mods: { critMult: (c, v) => (c.luck() >= 10 ? Math.max(v, 2.5) : v) },
    model: { t: 'hood', a: 0x24684c, b: 0xf2c14e, lining: 0x123a2a, card: true, gem: 0xf2c14e, wear: { y: -0.01, s: 0.96 } } },
  { id: 'charmed_vest', name: 'Charmed Vest', schools: [FORTUNE], slot: 'body', rarity: C,
    text: 'When attacked: 30% chance to gain 1 Luck.', hooks: { attacked: c => c.chance(0.3) && c.gain('luck', 1) },
    model: { t: 'armor', kind: 'vest', a: 0x2f8a63, b: 0x1e5a40, c: 0xf2c14e, clover: 0xf2c14e } },
  { id: 'gauntlets_of_fortune', name: 'Gauntlets of Fortune', schools: [FORTUNE], slot: 'gloves', rarity: R,
    text: 'On crit: gain 1 Luck.', hooks: { crit: c => c.gain('luck', 1) },
    model: { t: 'glove', a: 0x2f8a63, b: 0xf2c14e, clover: 0xf2c14e } },
  { id: 'four_leaf_boots', name: 'Four-Leaf Boots', schools: [FORTUNE], slot: 'boots', rarity: C,
    text: 'Start of fight: gain 8 Luck.', hooks: { start: c => c.gain('luck', 8) },
    model: { t: 'boot', a: 0x2f8a63, b: 0x1e5a40, c: 0x7ee0a8, extra: 'clover' } },
  { id: 'last_gamble', name: 'Last Gamble', schools: [FORTUNE], slot: 'cape', rarity: E,
    text: 'Clutch: your next 3 weapon hits are guaranteed crits.', hooks: { clutch: c => { c.me.autoCrit += 3; return true; } },
    model: { t: 'cape', a: 0x24684c, b: 0x123a2a, hem: 0xf2c14e, emblem: 'card' } },
  { id: 'loaded_dice', name: 'Loaded Dice', schools: [FORTUNE], slot: 'ring', rarity: R,
    text: 'Whenever a chance roll fails (including crits), gain 1 Luck (max 10 per fight).', flags: { loadedDice: true },
    model: { t: 'ring', band: 0xf2c14e, gem: 0xf4ecd8, shape: 'cube', glow: 0.1 } },
  { id: 'fatebound_talisman', name: 'Fatebound Talisman', schools: [FORTUNE], slot: 'amulet', rarity: L,
    text: 'Weapon hits deal +1 damage per 5 Luck you have past 10.',
    mods: { hitDmg: (c, d) => d + Math.floor(Math.max(0, c.luck() - 10) / 5) },
    model: { t: 'amulet', shape: 'star' } },

  /* ---------------- Prismatic ---------------- */
  { id: 'prism_staff', name: 'Prism Staff', schools: [PRISM], slot: 'weapon', rarity: E, kind: 'Staff',
    text: 'On hit: apply a random status (3 stacks).', weapon: W2(3.0, 14, c => c.randomStatus(3)),
    model: { t: 'prismStaff', hand: -0.35, hold: 0.62 } },
  { id: 'wishing_coin', name: 'Wishing Coin', schools: [PRISM], slot: 'offhand', rarity: E, kind: 'Coin',
    text: 'Every 5s: a random boon, or a random status (3 stacks).', cd: 5,
    act: c => (c.chance(0.5) ? c.randomBoon() : c.randomStatus(3)),
    model: { t: 'coin', rainbow: true, b: 0xf2c14e, c: 0xffffff, star: true, hold: 0.4 } },
  { id: 'kaleidoscope_lens', name: 'Kaleidoscope Lens', schools: [PRISM], slot: 'helm', rarity: E,
    text: '+5% weapon damage for each different status on the enemy.',
    mods: { hitDmg: (c, d) => d * (1 + 0.05 * ['burn', 'poison', 'frost', 'slow', 'sand'].filter(k => c.foe.st[k] > 0).length) },
    model: { t: 'goggles', a: 0x4a3a5a, b: 0xc6d0e2, wear: { y: 0.06, s: 0.8 } } },
  { id: 'chromatic_mail', name: 'Chromatic Mail', schools: [PRISM], slot: 'body', rarity: E,
    text: 'When hit: apply a random status (2 stacks) to the attacker.', hooks: { whenHit: c => c.randomStatus(2) },
    model: { t: 'armor', kind: 'mail', a: 0x5a4a6a, b: 0xc6d0e2, rainbowBands: true } },
  { id: 'rainbow_grips', name: 'Rainbow Grips', schools: [PRISM], slot: 'gloves', rarity: E,
    text: 'On crit: apply 2 different random statuses (2 stacks each).',
    hooks: { crit: c => { const a = c.pickStatus(); c.apply(a, 2); return c.apply(c.pickStatus(a), 2); } },
    model: { t: 'glove', a: 0x5a4a6a, b: 0xc6d0e2, rainbow: true } },
  { id: 'opalescent_boots', name: 'Opalescent Boots', schools: [PRISM], slot: 'boots', rarity: E,
    text: 'Start of fight: gain 3 random boons.', hooks: { start: c => { c.randomBoon(); c.randomBoon(); return c.randomBoon(); } },
    model: { t: 'boot', a: 0x6a5a7a, b: 0x3a2a4a, extra: 'rainbow' } },
  { id: 'prism_cloak', name: 'Prism Cloak', schools: [PRISM], slot: 'cape', rarity: E,
    text: "Clutch: trigger a random school's clutch cape effect.", hooks: {},
    model: { t: 'cape', a: 0x4a3a5a, b: 0x2a1a3a, stripes: true } },
  { id: 'fools_opal', name: "Fool's Opal", schools: [PRISM], slot: 'ring', rarity: E,
    text: 'Your random effects ignore weighting, and their amounts are doubled.', flags: { foolsOpal: true },
    model: { t: 'ring', band: 0xc6d0e2, gem: 0xffffff, shape: 'opal' } },
  { id: 'prism_heart', name: 'Prism Heart', schools: [PRISM], slot: 'amulet', rarity: L,
    text: 'Whenever you apply a status, also apply a different random status at half the stacks (rounded up).', flags: { prismHeart: true },
    model: { t: 'amulet', shape: 'prismHeart' } },


  /* ---------------- Thorn ----------------
     Thorns strike back whenever an enemy weapon hit lands on you. Strong against fast and dual-wield
     builds, weak against Burn and Poison (no hits) and Sand (misses never trigger it), which
     Ironbark Plate and the Sandbriar Ring answer. */
  { id: 'briar_whip', name: 'Briar Whip', schools: [THORN], slot: 'weapon', rarity: C, kind: 'Whip',
    text: 'On hit: gain 1 Thorns, up to 3 from this whip.',
    weapon: W(1.4, 3, c => { if ((c.data.n ?? 0) >= 3) return false; c.data.n = (c.data.n ?? 0) + 1; return c.gain('thorns', 1); }),
    model: { t: 'whip', grip: 0x5a3a24, vine: 0x4f6a2a, thorn: 0xe9d9b0, bloom: 0xe86f9e, hand: -0.3, hold: 0.85 } },
  { id: 'bramble_maul', name: 'Bramble Maul', schools: [THORN], slot: 'weapon', rarity: R, kind: 'Maul',
    text: 'On hit: deal bonus damage equal to your Thorns, then gain 2 Thorns.',
    weapon: W2(3.8, 16, c => { const hit = c.me.thorns > 0 && c.hit(c.me.thorns); return c.gain('thorns', 2) || hit; }),
    model: { t: 'mace', haft: 0x5a3a24, grip: 0x3a2618, head: 0x4f3a28, flange: 0x6f8a3a, gem: 0xe86f9e, spikes: { n: 16, color: 0xe9d9b0, size: 0.11, seed: 3, minY: 0.35 }, hand: -0.4, hold: 1.15 } },
  { id: 'hedgehog_shield', name: 'Hedgehog Shield', schools: [THORN], slot: 'offhand', rarity: C, kind: 'Shield',
    text: 'Every 4s: gain 1 Thorns and 4 Shield.', cd: 4, act: c => { c.gain('shield', 4); return c.gain('thorns', 1); },
    model: { t: 'buckler', a: 0x6a4a2e, b: 0x8a6a3a, c: 0xe86f9e, line: 0x3a2618, spikes: { n: 18, color: 0xe9d9b0, size: 0.1, seed: 5, front: true }, hold: 0.42 } },
  { id: 'bramble_crown', name: 'Bramble Crown', schools: [THORN], slot: 'helm', rarity: R,
    text: 'When hit: 30% chance to gain 1 Thorns.', hooks: { whenHit: c => c.chance(0.3) && c.gain('thorns', 1) },
    model: { t: 'crown', a: 0x5a3a24, b: 0x6f8a3a, c: 0xe86f9e, spikes: { n: 14, color: 0xe9d9b0, size: 0.08, seed: 9 }, wear: { y: 0.3, s: 0.82 } } },
  { id: 'briar_mail', name: 'Briar Mail', schools: [THORN], slot: 'body', rarity: C,
    text: 'Start of fight: gain 3 Thorns.', hooks: { start: c => c.gain('thorns', 3) },
    model: { t: 'armor', kind: 'vest', a: 0x5a4a2e, b: 0x3a2a1c, c: 0x6f8a3a, tint: 0x5a4a2e, spikes: { n: 16, color: 0xe9d9b0, size: 0.08, seed: 11, front: true } } },
  { id: 'ironbark_plate', name: 'Ironbark Plate', schools: [THORN], slot: 'body', rarity: E,
    text: 'Every 3s: your Thorns strike the enemy. This strike does not grant you Thorns.', cd: 3, act: c => c.thorns(true),
    model: { t: 'armor', kind: 'plate', a: 0x4f3a28, b: 0x6f8a3a, c: 0xe86f9e, tint: 0x4f3a28, spikes: { n: 22, color: 0xe9d9b0, size: 0.1, seed: 13, front: true } } },
  { id: 'spinefist', name: 'Spinefist', schools: [THORN], slot: 'gloves', rarity: R,
    text: 'Your weapon hits deal bonus damage equal to half your Thorns.',
    mods: { hitDmg: (c, d) => d + c.me.thorns * 0.5 },
    model: { t: 'glove', a: 0x5a4a2e, b: 0x3a2a1c, spikes: { n: 8, color: 0xe9d9b0, size: 0.07, seed: 17 } } },
  { id: 'nettle_treads', name: 'Nettle Treads', schools: [THORN], slot: 'boots', rarity: C,
    text: 'When an enemy attack misses you, gain 1 Thorns.',
    hooks: { enemyMiss: c => c.gain('thorns', 1) },
    model: { t: 'boot', a: 0x4f6a2a, b: 0x3a2a1c, spikes: { n: 10, color: 0xe9d9b0, size: 0.07, seed: 19 } } },
  { id: 'briar_cloak', name: 'Briar Cloak', schools: [THORN], slot: 'cape', rarity: E,
    text: 'Clutch: double your Thorns, then gain 3 more.',
    hooks: { clutch: c => { c.gain('thorns', c.me.thorns); return c.gain('thorns', 3); } },
    model: { t: 'cape', a: 0x3f5a2a, b: 0x2a1c14, hem: 0xe86f9e, emblem: 'rose', spikes: { n: 14, color: 0xe9d9b0, size: 0.08, seed: 23 } } },
  { id: 'briarheart', name: 'Briarheart', schools: [THORN], slot: 'amulet', rarity: L,
    text: 'Whenever an enemy weapon hit triggers your Thorns, gain 1 Thorns on every third trigger.',
    hooks: { thorned: (c, o) => { if (o?.pulse) return false; c.data.n = (c.data.n ?? 0) + 1; return c.data.n % 3 === 0 && c.gain('thorns', 1); } },
    model: { t: 'amulet', shape: 'rose' } },


  /* ---------------- Lunar ----------------
     Regen heals 1 per stack every 2s and never wears off. Cleanse removes stacks from your biggest debuffs.
     The counter to status builds, weak against burst (it heals slowly) and Burn (which cuts healing). */
  { id: 'moon_sickle', name: 'Moon Sickle', schools: [LUNAR], slot: 'weapon', rarity: C, kind: 'Sickle',
    text: 'On hit: gain 1 Regen, up to 5 from this sickle.',
    weapon: W(1.6, 5, c => { if ((c.data.n ?? 0) >= 5) return false; c.data.n = (c.data.n ?? 0) + 1; return c.gain('regen', 1); }),
    model: { t: 'sword', curve: 0.32, blade: 0xd8def0, edge: 0x9aa8ff, glow: 0.4, guard: 0x6a74a8, grip: 0x2c3050, gem: 0x9aa8ff, hold: 0.78 } },
  { id: 'tidecaller', name: 'Tidecaller', schools: [LUNAR], slot: 'weapon', rarity: R, kind: 'Staff',
    text: 'On hit: Cleanse 2, and gain 1 Regen for each stack removed.',
    weapon: W2(3.2, 17, c => { const n = c.cleanse(2); return n > 0 && c.gain('regen', n); }),
    model: { t: 'glaive', haft: 0x2c3050, blade: 0xd8def0, trim: 0x9aa8ff, tassel: 0x6a74a8, gem: 0x9aa8ff, hand: -0.5, hold: 0.58 } },
  { id: 'moonwell_flask', name: 'Moonwell Flask', schools: [LUNAR], slot: 'offhand', rarity: C, kind: 'Flask',
    text: 'Every 5s: gain 2 Regen.', cd: 5, act: c => c.gain('regen', 2),
    model: { t: 'lantern', a: 0x6a74a8, b: 0xd8def0, glow: 0x9aa8ff, hold: 0.45, grip: 0.66 } },
  { id: 'clarity_chime', name: 'Clarity Chime', schools: [LUNAR], slot: 'offhand', rarity: R, kind: 'Bell',
    text: 'Every 4s: Cleanse 2.', cd: 4, act: c => c.cleanse(2) > 0,
    model: { t: 'bell', a: 0xc6d0e2, b: 0x9aa8ff, hold: 0.45, grip: 0.74 } },
  { id: 'crescent_circlet', name: 'Crescent Circlet', schools: [LUNAR], slot: 'helm', rarity: R,
    text: 'Whenever your Regen ticks, Cleanse 1.', hooks: { regenTick: c => c.cleanse(1) > 0 },
    model: { t: 'crown', a: 0xc6d0e2, b: 0x9aa8ff, c: 0xf4f0ff, wear: { y: 0.3, s: 0.82 } } },
  { id: 'moonweave_robe', name: 'Moonweave Robe', schools: [LUNAR], slot: 'body', rarity: C,
    text: 'Start of fight: gain 3 Regen.', hooks: { start: c => c.gain('regen', 3) },
    model: { t: 'armor', kind: 'robe', a: 0x3a4070, b: 0xc6d0e2, tint: 0x3a4070 } },
  { id: 'tidal_gloves', name: 'Tidal Gloves', schools: [LUNAR], slot: 'gloves', rarity: R,
    text: 'On crit: gain 2 Regen.', hooks: { crit: c => c.gain('regen', 2) },
    model: { t: 'glove', a: 0x3a4070, b: 0xc6d0e2, gem: 0x9aa8ff } },
  { id: 'moonstep_boots', name: 'Moonstep Boots', schools: [LUNAR], slot: 'boots', rarity: C,
    text: 'Start of fight: gain 2 Regen. Whenever you Cleanse, gain 1 Regen.',
    hooks: { start: c => c.gain('regen', 2), cleansed: c => c.gain('regen', 1) },
    model: { t: 'boot', a: 0x3a4070, b: 0xc6d0e2, extra: 'wings' } },
  { id: 'tide_cloak', name: 'Tide Cloak', schools: [LUNAR], slot: 'cape', rarity: E,
    text: 'Clutch: Cleanse 15 and gain 4 Regen.', hooks: { clutch: c => { c.cleanse(15); return c.gain('regen', 4); } },
    model: { t: 'cape', a: 0x3a4070, b: 0x1a1e38, hem: 0x9aa8ff, hemGlow: 0.5, emblem: 'crescent' } },
  { id: 'moon_mirror', name: 'Mirror of the Moon', schools: [LUNAR], slot: 'amulet', rarity: L,
    text: 'Stacks you Cleanse are applied to the enemy instead of vanishing.', flags: { moonMirror: true },
    model: { t: 'amulet', shape: 'moon' } },

  /* ---------------- Bridge rings ---------------- */
  { id: 'kindling_band', name: 'Kindling Band', schools: [FIRE, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you apply Burn, heal 2. Each trigger adds +1 to the heal (max +8). Resets each fight.',
    hooks: { applied: (c, o) => { if (o.type !== 'burn') return false; const k = c.data.k ?? 0; c.data.k = Math.min(8, k + 1); return c.heal(2 + k); } },
    model: { t: 'kindling' } },
  { id: 'hearthfire_ring', name: 'Hearthfire Ring', schools: [FIRE, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you heal, gain 1 Heat (at most once per second).',
    hooks: { healed: c => { if (c.t - (c.data.last ?? -9) < 1) return false; c.data.last = c.t; return c.gain('heat', 1); } },
    model: { t: 'ring', band: 0xe8b73a, gem: 0xff8a2a, shape: 'sphere', deco: 'flame' } },
  { id: 'forgeheart_ring', name: 'Forgeheart Ring', schools: [FIRE, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you gain Heat, gain 2 Shield.', hooks: { gainedHeat: c => c.gain('shield', 2) },
    model: { t: 'ring', band: 0x47414f, band2: 0xe8b73a, gem: 0xff6a1a, shape: 'cube' } },
  { id: 'frostfire_band', name: 'Frostfire Band', schools: [FIRE, FROST], slot: 'ring', rarity: R,
    text: 'Whenever the enemy Freezes, double their Burn.', hooks: { enemyFreeze: c => c.foe.st.burn > 0 && c.addRaw('burn', c.foe.st.burn) },
    model: { t: 'ring', band: 0xc6d0e2, band2: 0xff6a1a, gem: 0x7fd6ff, deco: 'flame' } },
  { id: 'hoarfrost_ring', name: 'Hoarfrost Ring', schools: [FROST, FIRE], slot: 'ring', rarity: R,
    text: 'Whenever you apply Slow, gain 1 Heat.', hooks: { applied: (c, o) => o.type === 'slow' && c.gain('heat', 1) },
    model: { t: 'ring', band: 0xc6d0e2, gem: 0xff8a2a, deco: 'snow' } },
  { id: 'witchfire_ring', name: 'Witchfire Ring', schools: [FIRE, VENOM], slot: 'ring', rarity: R,
    text: 'Whenever Burn ticks: 50% chance to apply 1 Poison.', hooks: { burnTick: c => c.chance(0.5) && c.apply('poison', 1) },
    model: { t: 'ring', band: 0x3f5a2e, gem: 0xff6a1a, deco: 'drop', decoColor: 0x8bd34a } },
  { id: 'glassblowers_ring', name: "Glassblower's Ring", schools: [FIRE, DESERT], slot: 'ring', rarity: R,
    text: 'Whenever you apply Burn to an enemy with 5+ Sand, consume 5 Sand and deal 15 damage.',
    hooks: { applied: (c, o) => { if (o.type !== 'burn' || c.foe.st.sand < 5) return false; c.foe.st.sand -= 5; return c.hit(15); } },
    model: { t: 'ring', band: 0xc48a24, gem: 0xbfefff, shape: 'sphere', deco: 'flame' } },
  { id: 'bloodfire_ring', name: 'Bloodfire Ring', schools: [FIRE, BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever a weapon hit Lifesteals, apply 1 Burn.', hooks: { lifestole: c => c.apply('burn', 1) },
    model: { t: 'ring', band: 0x2a1a1e, gem: 0xff6a1a, deco: 'fangs' } },
  { id: 'lucky_ember', name: 'Lucky Ember', schools: [FIRE, FORTUNE], slot: 'ring', rarity: R,
    text: 'Burn ticks can crit.', flags: { burnCrit: true },
    model: { t: 'ring', band: 0xf2c14e, gem: 0xff6a1a, deco: 'clover' } },
  { id: 'paralytic_ring', name: 'Paralytic Ring', schools: [VENOM, FROST], slot: 'ring', rarity: R,
    text: 'Weapon hits apply 1 Slow per 4 Poison on the enemy.', hooks: { hit: c => { const n = Math.floor(c.foe.st.poison / 4); return n > 0 && c.apply('slow', n); } },
    model: { t: 'ring', band: 0x3f5a2e, gem: 0x7fd6ff, deco: 'drop' } },
  { id: 'scorpion_ring', name: 'Scorpion Ring', schools: [VENOM, DESERT], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses, apply 3 Poison.', hooks: { enemyMiss: c => c.apply('poison', 3) },
    model: { t: 'ring', band: 0xc48a24, gem: 0x8bd34a, deco: 'fangs' } },
  { id: 'leechmaw_ring', name: 'Leechmaw Ring', schools: [VENOM, HOLY], slot: 'ring', rarity: R,
    text: 'Heal for 30% of the Poison damage you deal.', hooks: { poisonTick: (c, o) => o.dmg > 0 && c.heal(o.dmg * 0.3) },
    model: { t: 'ring', band: 0xe8b73a, gem: 0x8bd34a, shape: 'sphere', deco: 'fangs' } },
  { id: 'leeching_fang', name: 'Leeching Fang', schools: [VENOM, BLOOD], slot: 'ring', rarity: R,
    text: 'Weapon hits against a Poisoned enemy have +10% Lifesteal.', mods: { lifesteal: (c, v) => (c.foe.st.poison > 0 ? v + 0.1 : v) },
    model: { t: 'ring', band: 0x2a1a1e, gem: 0x8bd34a, deco: 'drop', decoColor: 0xd8344f } },
  { id: 'vipers_eye', name: "Viper's Eye", schools: [VENOM, FORTUNE], slot: 'ring', rarity: R,
    text: 'Poison ticks can crit.', flags: { poisonCrit: true },
    model: { t: 'ring', band: 0xf2c14e, gem: 0x8bd34a, deco: 'eye' } },
  { id: 'quicksand_ring', name: 'Quicksand Ring', schools: [DESERT, FROST], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses, apply 2 Slow.', hooks: { enemyMiss: c => c.apply('slow', 2) },
    model: { t: 'ring', band: 0xc48a24, gem: 0x7fd6ff, deco: 'sand' } },
  { id: 'glacial_aegis', name: 'Glacial Aegis', schools: [FROST, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever the enemy Freezes, gain 12 Shield.', hooks: { enemyFreeze: c => c.gain('shield', 12) },
    model: { t: 'ring', band: 0xe8b73a, gem: 0x7fd6ff, deco: 'snow' } },
  { id: 'frozen_blood', name: 'Frozen Blood', schools: [FROST, BLOOD], slot: 'ring', rarity: R,
    text: '+25% Lifesteal against Frozen enemies.', mods: { lifesteal: (c, v) => (c.foe.frozen > 0 ? v + 0.25 : v) },
    model: { t: 'ring', band: 0xc6d0e2, gem: 0xd8344f, deco: 'snow' } },
  { id: 'shatter_ring', name: 'Shatter Ring', schools: [FROST, FORTUNE], slot: 'ring', rarity: R,
    text: 'Weapon hits on a Frozen enemy always crit.', flags: { shatter: true },
    model: { t: 'ring', band: 0xf2c14e, gem: 0x7fd6ff, deco: 'spikes' } },
  { id: 'oasis_ring', name: 'Oasis Ring', schools: [DESERT, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses, heal 4 and gain 4 Shield.', hooks: { enemyMiss: c => { c.heal(4); return c.gain('shield', 4); } },
    model: { t: 'ring', band: 0xc48a24, gem: 0x4fb2e8, shape: 'sphere', deco: 'sand' } },
  { id: 'duelists_ring', name: "Duelist's Ring", schools: [DESERT, BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses, your next weapon hit has +25% Lifesteal.',
    hooks: { enemyMiss: c => { c.data.next = 0.25; return true; }, hit: c => { c.data.next = 0; return false; } },
    mods: { lifesteal: (c, v) => v + (c.data.next ?? 0) },
    model: { t: 'ring', band: 0xc48a24, gem: 0xd8344f, deco: 'sand' } },
  { id: 'desert_fox_ring', name: 'Desert Fox Ring', schools: [DESERT, FORTUNE], slot: 'ring', rarity: R,
    text: '+1 Luck per 2 Sand on the enemy.', mods: { luck: (c, v) => v + Math.floor(c.foe.st.sand / 2) },
    model: { t: 'ring', band: 0xf2c14e, gem: 0xe8c27a, deco: 'eye' } },
  { id: 'crimson_bulwark', name: 'Crimson Bulwark', schools: [HOLY, BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever a weapon hit Lifesteals, gain 2 Shield.', hooks: { lifestole: c => c.gain('shield', 2) },
    model: { t: 'ring', band: 0xe8b73a, gem: 0xd8344f, shape: 'heart' } },
  { id: 'blessed_dice', name: 'Blessed Dice', schools: [HOLY, FORTUNE], slot: 'ring', rarity: R,
    text: 'Your heals and Shield gains can crit.', flags: { healCrit: true, shieldCrit: true },
    model: { t: 'ring', band: 0xe8b73a, gem: 0xf4ecd8, shape: 'cube', glow: 0.1, deco: 'wings' } },
  { id: 'venomspine_ring', name: 'Venomspine Ring', schools: [THORN, VENOM], slot: 'ring', rarity: R,
    text: 'Whenever your Thorns trigger, apply 1 Poison.', hooks: { thorned: c => c.apply('poison', 1) },
    model: { t: 'ring', gem: 0x8bd34a, deco: 'spikes' } },
  { id: 'pyrebriar_ring', name: 'Pyrebriar Ring', schools: [THORN, FIRE], slot: 'ring', rarity: R,
    text: 'Whenever your Thorns trigger, gain 1 Heat.', hooks: { thorned: c => c.gain('heat', 1) },
    model: { t: 'ring', gem: 0xff6a1a, deco: 'flame' } },
  { id: 'rimespine_ring', name: 'Rimespine Ring', schools: [THORN, FROST], slot: 'ring', rarity: R,
    text: 'Whenever your Thorns trigger, apply 2 Frost.', hooks: { thorned: c => c.apply('frost', 2) },
    model: { t: 'ring', gem: 0x7fd6ff, deco: 'snow' } },
  { id: 'bloodbriar_ring', name: 'Bloodbriar Ring', schools: [THORN, BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever your Thorns trigger, heal for half the damage they dealt.', hooks: { thorned: (c, o) => c.heal(o.dmg * 0.5) },
    model: { t: 'ring', gem: 0xd8344f, deco: 'fangs' } },
  { id: 'hallowed_briar', name: 'Hallowed Briar', schools: [THORN, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you gain Shield, gain 1 Thorns (at most once per second).',
    hooks: { gainedShield: c => { if (c.t - (c.data.t ?? -9) < 1) return false; c.data.t = c.t; return c.gain('thorns', 1); } },
    model: { t: 'ring', gem: 0xf2d67c, shape: 'heart', deco: 'wings' } },
  { id: 'lucky_thorn', name: 'Lucky Thorn', schools: [THORN, FORTUNE], slot: 'ring', rarity: R,
    text: 'Your Thorns can crit.', flags: { thornCrit: true },
    model: { t: 'ring', gem: 0xe86f9e, deco: 'clover' } },
  { id: 'sandbriar_ring', name: 'Sandbriar Ring', schools: [THORN, DESERT], slot: 'ring', rarity: R,
    text: 'When an enemy attack misses you, your Thorns strike them anyway.', hooks: { enemyMiss: c => c.thorns() },
    model: { t: 'ring', gem: 0xe8c27a, deco: 'sand' } },
  { id: 'ember_moon', name: 'Ember Moon', schools: [LUNAR, FIRE], slot: 'ring', rarity: R,
    text: 'Whenever your Regen ticks, apply 1 Burn.', hooks: { regenTick: c => c.apply('burn', 1) },
    model: { t: 'ring', gem: 0xff6a1a, deco: 'flame' } },
  { id: 'frostmoon_band', name: 'Frostmoon Band', schools: [LUNAR, FROST], slot: 'ring', rarity: R,
    text: 'Whenever the enemy Freezes, gain 3 Regen.', hooks: { enemyFreeze: c => c.gain('regen', 3) },
    model: { t: 'ring', gem: 0x7fd6ff, deco: 'snow' } },
  { id: 'nightshade_ring', name: 'Nightshade Ring', schools: [LUNAR, VENOM], slot: 'ring', rarity: R,
    text: 'Whenever you Cleanse, apply 2 Poison.', hooks: { cleansed: c => c.apply('poison', 2) },
    model: { t: 'ring', gem: 0x8bd34a, deco: 'drop' } },
  { id: 'mirage_moon', name: 'Mirage Moon', schools: [LUNAR, DESERT], slot: 'ring', rarity: R,
    text: 'Whenever an enemy attack misses you, gain 1 Regen.', hooks: { enemyMiss: c => c.gain('regen', 1) },
    model: { t: 'ring', gem: 0xe8c27a, deco: 'sand' } },
  { id: 'hallowed_tide', name: 'Hallowed Tide', schools: [LUNAR, HOLY], slot: 'ring', rarity: R,
    text: 'Whenever you gain Shield, Cleanse 1 (at most once per second).',
    hooks: { gainedShield: c => { if (c.t - (c.data.t ?? -9) < 1) return false; c.data.t = c.t; return c.cleanse(1) > 0; } },
    model: { t: 'ring', gem: 0xf2d67c, shape: 'sphere', deco: 'wings' } },
  { id: 'bloodmoon_ring', name: 'Bloodmoon Ring', schools: [LUNAR, BLOOD], slot: 'ring', rarity: R,
    text: 'Whenever you Lifesteal, gain 1 Regen (at most once per second).',
    hooks: { lifestole: c => { if (c.t - (c.data.t ?? -9) < 1) return false; c.data.t = c.t; return c.gain('regen', 1); } },
    model: { t: 'ring', gem: 0xd8344f, deco: 'fangs' } },
  { id: 'lucky_moon', name: 'Lucky Moon', schools: [LUNAR, FORTUNE], slot: 'ring', rarity: R,
    text: 'Your Regen ticks can crit.', flags: { regenCrit: true },
    model: { t: 'ring', gem: 0x9aa8ff, deco: 'clover' } },
  { id: 'moonbriar', name: 'Moonbriar', schools: [LUNAR, THORN], slot: 'ring', rarity: R,
    text: 'Whenever your Thorns trigger, gain 1 Regen.', hooks: { thorned: c => c.gain('regen', 1) },
    model: { t: 'ring', gem: 0xe86f9e, deco: 'spikes' } },
  { id: 'vampires_die', name: "Vampire's Die", schools: [BLOOD, FORTUNE], slot: 'ring', rarity: R,
    text: 'Whenever you crit, gain 2% Lifesteal for the rest of the fight (max +20%).',
    hooks: { crit: c => { if ((c.data.ls ?? 0) >= 0.2) return false; c.data.ls = Math.min(0.2, (c.data.ls ?? 0) + 0.02); return true; } },
    mods: { lifesteal: (c, v) => v + (c.data.ls ?? 0) },
    model: { t: 'ring', band: 0x2a1a1e, gem: 0xf4ecd8, shape: 'cube', glow: 0.1 } },
  { id: 'phoenix_heart', name: 'Phoenix Heart', schools: [FIRE, HOLY], slot: 'amulet', rarity: L,
    text: 'Burn ticks heal you for 50% of their damage. Your heals apply Burn equal to 20% of the amount healed.',
    hooks: {
      burnTick: (c, o) => o.dmg > 0 && c.heal(o.dmg * 0.5),
      healed: (c, o) => { const n = Math.round(o.n * 0.2); return n > 0 && c.apply('burn', n); },
    },
    model: { t: 'amulet', shape: 'phoenix' } },
];

const METAL = { Lunar: 0xb8c0dc, Thorn: 0x5a3a24, Fire: 0x9a4524, Frost: 0xc6d0e2, Venom: 0x4f6a34, Desert: 0xc48a24, Holy: 0xe8b73a, Blood: 0x3a1a20, Fortune: 0x2f8a63, Prismatic: 0xc6d0e2 };
const RING_STYLE = {
  ashen_ring: 'flat', rimeheart_ring: 'twist', festering_ring: 'band', dune_ring: 'flat', sanctified_vessel: 'double', sanguine_ring: 'twist',
  loaded_dice: 'flat', fools_opal: 'double', hearthfire_ring: 'band', forgeheart_ring: 'flat', frostfire_band: 'double', hoarfrost_ring: 'twist',
  witchfire_ring: 'twist', glassblowers_ring: 'flat', bloodfire_ring: 'double', lucky_ember: 'band', paralytic_ring: 'twist', scorpion_ring: 'flat',
  leechmaw_ring: 'double', leeching_fang: 'twist', vipers_eye: 'flat', quicksand_ring: 'twist', glacial_aegis: 'double', frozen_blood: 'flat',
  shatter_ring: 'band', oasis_ring: 'double', duelists_ring: 'flat', desert_fox_ring: 'twist', crimson_bulwark: 'double', blessed_dice: 'band', vampires_die: 'flat',
  ember_moon: 'band', frostmoon_band: 'twist', nightshade_ring: 'flat', mirage_moon: 'double', hallowed_tide: 'band', bloodmoon_ring: 'twist', lucky_moon: 'flat', moonbriar: 'double',
  venomspine_ring: 'twist', pyrebriar_ring: 'flat', rimespine_ring: 'twist', bloodbriar_ring: 'double', hallowed_briar: 'band', lucky_thorn: 'twist', sandbriar_ring: 'flat',
};
for (const def of LIST) {
  if (def.model.t !== 'ring') continue;
  def.model.style = RING_STYLE[def.id] ?? 'band';
  if (def.schools.length === 2) {
    def.model.band = METAL[def.schools[0]];
    def.model.band2 = METAL[def.schools[1]];
    def.model.setting = METAL[def.schools[1]];
  }
}

// Trinkets (trinkets.js) are gear too: their own slots, no HP, no school, no sockets.
LIST.push(...TRINKET_LIST);

// Jewellery starters: every ring and amulet does something on its own. Each of its schools adds a small
// start-of-fight effect (amulets get the stronger version), which also helps switch on the item's own condition.
// The engine reads def.starter; the text gets a matching first sentence.
const STARTER = {
  Fire: { ring: { heat: 2 }, amulet: { burn: 1, heat: 2 } }, Frost: { ring: { slow: 2 }, amulet: { frost: 5, slow: 2 } },
  Venom: { ring: { poison: 1 }, amulet: { poison: 2 } }, Desert: { ring: { sand: 2 }, amulet: { sand: 3 } },
  Holy: { ring: { shield: 5 }, amulet: { shield: 10 } }, Blood: { ring: { ls: 4 }, amulet: { ls: 8 } },
  Fortune: { ring: { luck: 1 }, amulet: { luck: 2 } }, Thorn: { ring: { thorns: 1 }, amulet: { thorns: 2 } },
  Lunar: { ring: { regen: 1 }, amulet: { regen: 2 } }, Prismatic: { ring: { random: 1 }, amulet: { random: 1 } },
};
// Items whose first school's starter would feed their own loop take the other school's.
const STARTER_FROM = { ember_moon: 'Fire', venomspine_ring: 'Venom', phoenix_heart: 'Holy' };
const ST_NAME = { slow: 'Slow', burn: 'Burn', frost: 'Frost', poison: 'Poison', sand: 'Sand', shield: 'Shield', thorns: 'Thorns', regen: 'Regen', heat: 'Heat' };
export function starterText(st) {
  const apply = ['burn', 'frost', 'slow', 'poison', 'sand'].filter(k => st[k]).map(k => `${st[k]} ${ST_NAME[k]}`);
  const gain = ['heat', 'shield', 'thorns', 'regen'].filter(k => st[k]).map(k => `${st[k]} ${ST_NAME[k]}`);
  const list = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0]);
  const start = [apply.length && `apply ${list(apply)}`, gain.length && `gain ${list(gain)}`, st.random && `apply ${st.random} random status${st.random > 1 ? 'es' : ''}`].filter(Boolean);
  const stats = [st.luck && `+${st.luck} Luck`, st.ls && `+${st.ls}% Lifesteal`].filter(Boolean);
  return [start.length && `Start of fight: ${start.join(', ')}.`, stats.length && `${list(stats)}.`].filter(Boolean).join(' ');
}
for (const def of LIST) {
  const kind = def.slot === 'ring' ? 'ring' : def.slot === 'amulet' ? 'amulet' : null;
  if (!kind) continue;
  const st = {};
  // Bridge items take one school's starter (the first, or STARTER_FROM's pick), so the item alone doesn't run both halves of its own combo.
  for (const [k, v] of Object.entries(STARTER[STARTER_FROM[def.id] ?? def.schools[0]]?.[kind] ?? {})) st[k] = (st[k] ?? 0) + v;
  if (!Object.keys(st).length) continue;
  def.starter = st;
  def.text = `${starterText(st)} ${def.text}`;
}
export const ITEMS = {};
for (const def of LIST) {
  def.price = def.slot === 'trinket' ? def.price : PRICE[def.rarity] + (def.weapon?.hands === 2 ? 1 : 0);
  def.hp = ARMOR_SLOTS.includes(def.slot) ? ARMOR_HP[def.rarity] : 0;
  def.bridge = def.schools.length > 1;
  ITEMS[def.id] = def;
}
export const ITEM_IDS = LIST.map(d => d.id);

// Prism Cloak borrows a random school's clutch cape.
const CLUTCH_CAPES = ['phoenix_cloak', 'winters_shroud', 'sirocco_cloak', 'guardians_mantle', 'blood_moon_cloak', 'last_gamble'];
ITEMS.prism_cloak.hooks.clutch = c => ITEMS[CLUTCH_CAPES[Math.floor(c.rng() * CLUTCH_CAPES.length)]].hooks.clutch(c);

export const slotLabel = def => {
  if (def.slot === 'weapon') return def.weapon.hands === 2 ? 'Two-handed weapon' : 'One-handed weapon';
  if (def.dual) return 'Offhand weapon';
  return SLOT_NAME[def.slot];
};
export const statLine = def => {
  if (def.weapon) return `${def.kind} · ${def.weapon.interval.toFixed(1)}s · ${def.weapon.dmg} dmg`;
  if (def.dual) return `${def.kind} · ${def.dual.interval.toFixed(1)}s · ${def.dual.dmg} dmg`;
  if (def.slot === 'trinket') return 'Trinket · once per fight';
  if (def.cd) return `${def.kind} · every ${def.cd}s`;
  if (def.hp) return `${SLOT_NAME[def.slot]} · +${def.hp} HP`;
  return def.bridge ? 'Bridge ring' : SLOT_NAME[def.slot];
};
export const fitsSlot = (id, slot) => {
  const s = ITEMS[id].slot;
  if (s === 'ring') return slot === 'ring1' || slot === 'ring2';
  if (s === 'trinket') return slot === 'trinket1' || slot === 'trinket2';
  return s === slot;
};
// Trinket slots: one from the start, a second from TRINKET2_DAY.
export const TRINKET2_DAY = 5;
export const TRINKET_DAY = 2;

/* ---------------- Shop and ghost builds ---------------- */
export const rarityOpen = day => [C, R, ...(day >= 3 ? [E] : []), ...(day >= 5 ? [L] : [])];
const RARITY_WEIGHT = { common: 10, rare: 6, epic: 3, legendary: 1 };

export function rollShopId(day, rng, filter = () => true) {
  const open = rarityOpen(day);
  const pool = LIST.filter(d => open.includes(d.rarity) && filter(d));
  if (!pool.length) return null;
  const total = pool.reduce((s, d) => s + RARITY_WEIGHT[d.rarity], 0);
  let r = rng() * total;
  for (const d of pool) { if ((r -= RARITY_WEIGHT[d.rarity]) < 0) return d.id; }
  return pool[pool.length - 1].id;
}

// One weapon, one offhand, two armor pieces, and one piece of jewelry. The same shape the ghost shops from.
const SHOP_FILTERS = [
  d => d.slot === 'weapon',
  d => d.slot === 'offhand',
  d => ARMOR_SLOTS.includes(d.slot),
  d => ARMOR_SLOTS.includes(d.slot),
  d => d.slot === 'ring' || d.slot === 'amulet',
];
// The day's trinket offer (from TRINKET_DAY), any trinket with equal odds; null before then.
export function rollTrinketId(day, rng, exclude = () => false) {
  if (day < TRINKET_DAY) return null;
  const pool = TRINKET_LIST.filter(d => !exclude(d));
  return pool.length ? pool[Math.floor(rng() * pool.length)].id : null;
}
export function rollShopOffers(day, rng, exclude = () => false) {
  const used = new Set();
  const ids = [];
  for (const filter of SHOP_FILTERS) {
    const id = rollShopId(day, rng, d => filter(d) && !used.has(d.id) && !exclude(d))
      || rollShopId(day, rng, d => filter(d) && !exclude(d))
      || rollShopId(day, rng, filter);
    if (id) used.add(id);
    ids.push(id);
  }
  return ids;
}

const TITLES = {
  Fire: ['Ember', 'Cinder', 'Pyre'], Frost: ['Rime', 'Glacial', 'Wintry'], Venom: ['Blighted', 'Viper', 'Mire'],
  Desert: ['Dune', 'Sirocco', 'Mirage'], Holy: ['Gilded', 'Dawn', 'Sainted'], Blood: ['Crimson', 'Sanguine', 'Feral'],
  Fortune: ['Lucky', 'Gilded', 'Jackpot'], Thorn: ['Briar', 'Bramble', 'Thorned'], Lunar: ['Moonlit', 'Tidal', 'Silver'],
};
const NOUNS = ['Wanderer', 'Duelist', 'Pilgrim', 'Raider', 'Warden', 'Drifter', 'Knight', 'Hexer'];

const GEAR_RANK = { common: 1, rare: 2, epic: 3, legendary: 4 };

// A same-day ghost who shopped, imperfectly, on about a player's budget: gold every day, one reroll a day,
// unspent gold carries. It builds around two schools but buys less of a school the more it already has,
// takes bridge pieces that reach into a third, and fills empty slots with whatever gear is on the shelf.
export function makeGhost(day, rng) {
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const main = pick(SCHOOLS);
  const second = rng() < 0.85 ? pick(SCHOOLS.filter(s => s !== main)) : null;
  const plan = [main, second].filter(Boolean);
  const equip = {};
  const count = {};
  let gold = 0;
  let uid = 1;
  const tally = (def, k) => { for (const s of def.schools) count[s] = (count[s] ?? 0) + k; };
  // How well a piece suits this build; 0 means it would not buy it.
  const fit = def => {
    // Trinkets suit any build, except Volcanic Heart, which needs Fire's Heat.
    if (def.slot === 'trinket') return def.id === 'volcanic_heart' ? (plan.includes('Fire') ? 2 : 0.6) : 1.8;
    if (def.schools.includes('Prismatic')) return 1.6;
    const on = def.schools.filter(s => plan.includes(s));
    if (!on.length) return 0.5;
    let f = on.length === def.schools.length ? 2 : 1.5;
    if (on.includes(main)) f += 0.4;
    return Math.max(0.6, f - 0.22 * Math.max(...on.map(s => count[s] ?? 0)));
  };
  const value = def => fit(def) * 4 + GEAR_RANK[def.rarity] * 3;
  const slotsFor = (def, d) => {
    if (def.slot === 'offhand' && equip.weapon && ITEMS[equip.weapon.id].weapon?.hands === 2) return [];
    if (def.slot === 'ring') return [equip.ring1?.id, equip.ring2?.id].includes(def.id) ? [] : ['ring1', 'ring2'];
    if (def.slot === 'trinket') return [equip.trinket1?.id, equip.trinket2?.id].includes(def.id) ? [] : d >= TRINKET2_DAY ? ['trinket1', 'trinket2'] : ['trinket1'];
    return [def.slot];
  };
  const sellBack = slot => {
    const cur = equip[slot];
    if (!cur) return;
    gold += Math.floor(ITEMS[cur.id].price / 2);
    tally(ITEMS[cur.id], -1);
    delete equip[slot];
  };
  for (let d = 1; d <= day; d++) {
    gold += d === 1 ? 10 : 9;
    // One plain market a day, plus rerolls spent hunting its own schools.
    const offSchool = def => !def.schools.some(sc => plan.includes(sc));
    let offers = [...rollShopOffers(d, rng), ...rollShopOffers(d, rng, offSchool), ...rollShopOffers(d, rng, offSchool), rollTrinketId(d, rng)]
      .filter(Boolean).map(id => ITEMS[id]);
    for (let guard = 0; guard < 6; guard++) {
      let best = null;
      for (const def of offers) {
        for (const slot of slotsFor(def, d)) {
          const cur = equip[slot];
          const sell = cur ? Math.floor(ITEMS[cur.id].price / 2) : 0;
          if (def.price - sell > gold) continue;
          // An empty slot is worth filling with anything; a filled one only for a clear step up.
          // Off-school filler only goes in a slot still empty from day 3, and is the first thing replaced.
          const filler = fit(def) < 1;
          if (filler && (cur || d < 3)) continue;
          const gain = cur ? value(def) - value(ITEMS[cur.id]) - 2 : value(def) + (slot === 'weapon' ? 12 : 4) - (filler ? 6 : 0);
          if (gain <= 0) continue;
          const score = gain + rng() * 3;
          if (!best || score > best.score) best = { def, slot, score };
        }
      }
      if (!best) break;
      // Once kitted out for the day, it sometimes stops early and banks the gold.
      if (Object.keys(equip).length > d && rng() < 0.15) break;
      sellBack(best.slot);
      gold -= best.def.price;
      equip[best.slot] = { uid: uid++, id: best.def.id };
      tally(best.def, 1);
      if (best.slot === 'weapon' && best.def.weapon?.hands === 2) sellBack('offhand');
      offers = offers.filter(def => def !== best.def);
    }
  }
  if (!equip.weapon) {
    const w = LIST.find(d => d.slot === 'weapon' && d.rarity === C && d.schools.includes(main));
    if (w) equip.weapon = { uid: uid++, id: w.id };
  }
  const name = `${pick(TITLES[main])} ${pick(NOUNS)}`;
  return { name, equip, schools: [...plan] };
}
