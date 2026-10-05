// Deterministic combat simulation, following the design doc's keyword rules.
// simulate() runs a whole fight up front and returns per-tick frames and an event list for playback.
import { itemMods, GEMS, gemKind, gemsOf } from './upgrades.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 0.1;
const HEAT_CAP = 20, SAND_CAP = 15, SLOW_CAP = 25, THORNS_CAP = 20, BURN_CAP = 8, BURN_CAP_WILDFIRE = 16, REGEN_CAP = 8, REGEN_EVERY = 2, BURN_PER = 0.5;
const FATIGUE_AT = 25, MAX_TIME = 75;
const POISON_EVERY = 3, POISON_CAP = 20, BURN_HEAL_CUT = 0.8, FREEZE_TIME = 3;
const WILDFIRE_AT = 8;
// Shared with the UI so status explanations always match the engine.
export const RULES = { THORNS_CAP, HEAT_CAP, SAND_CAP, SLOW_CAP, FATIGUE_AT, POISON_EVERY, POISON_CAP, BURN_CAP, BURN_CAP_WILDFIRE, REGEN_CAP, REGEN_EVERY, BURN_PER, BURN_HEAL_CUT, FREEZE_TIME, THAW_TIME: 2, FREEZE_AT: 10, SAND_MISS: 0.04, SPEED_PER: 0.03, BASE_CRIT: 0.05, LUCK_PER: 0.03, WILDFIRE_AT };
const STATUSES = ['burn', 'poison', 'frost', 'slow', 'sand'];
const STATUS_SCHOOL = { burn: 'Fire', poison: 'Venom', frost: 'Frost', slow: 'Frost', sand: 'Desert' };
const BOONS = [
  { k: 'heal', school: 'Holy' }, { k: 'shield', school: 'Holy' }, { k: 'heat', school: 'Fire' },
  { k: 'luck', school: 'Fortune' }, { k: 'ls', school: 'Blood' }, { k: 'thorns', school: 'Thorn' }, { k: 'regen', school: 'Lunar' },
];
// Item tiers from duplicates: Bronze, Silver, Gold scale an item's numbers; Gold cooldown items also fire 15% more often.
export const TIER_MULT = [1, 1.5, 2];
// Weapons are the main damage source, so their tiers step more gently.
export const WEAPON_TIER_MULT = [1, 1.15, 1.3];
export const tierMult = (def, tier = 1) => (def.weapon || def.dual ? WEAPON_TIER_MULT : TIER_MULT)[Math.min(3, Math.max(1, tier)) - 1];
const GOLD_CD = 0.85;
const HASTE_SPEED = 1.5, HASTE_MAX = 8;
const SLOT_ORDER = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet', 'trinket1', 'trinket2'];
const r1 = n => Math.round(n * 10) / 10;

// opts.maxTime ends the fight early as a draw (used by the practice dummy).
export function simulate(buildA, buildB, ITEMS, seed = 1, opts = {}) {
  const maxTime = opts.maxTime ?? MAX_TIME;
  const rng = mulberry32(seed >>> 0);
  let t = 0;
  const events = [];
  const frames = [];
  const ev = (type, data) => events.push({ t: r1(t), type, ...data });
  let cause = 'other';

  function makeFighter(side, build) {
    const f = {
      side, name: build.name, hp: 0, maxHp: 100, shield: 0,
      st: { burn: 0, poison: 0, frost: 0, slow: 0, sand: 0 },
      heat: 0, luck: 0, ls: 0, thorns: 0, frozen: 0, thaw: 0, clutch: false, dead: false,
      flags: {}, items: [], weapons: [], cds: [], schools: {},
      fullLs: 0, autoCrit: 0, diceLuck: 0,
      burnT: 0, poisonT: 0, regenT: 0, poisonTicks: 0, regen: 0,
      // Burn and Poison drain continuously; tick holds the damage since the last 1s / 3s tick (for hooks and crits),
      // shown holds what the UI hasn't floated yet.
      tick: { burn: 0, poison: 0 }, shown: { burn: 0, poison: 0 },
      start: { shield: 0, heat: 0, slow: 0, sand: 0, poison: 0, burn: 0, frost: 0, thorns: 0, regen: 0, random: 0 },
      // Gem bonuses (upgrades.js): status caps, Freeze length, Thorns damage, healing, low-HP and self-status damage, weapon speed.
      capBonus: {}, freezeBonus: 0, thornsBonus: 0, healPct: 0, lowDmgPct: 0, selfCatalyst: 0, gemSpd: 0,
      // Trinket moments: stasis (untouchable, can't act), berserk (faster, takes more), HP thresholds passed, HP history for rewinds.
      stasis: 0, berserk: 0, below: {}, hist: [],
      haste: 0,
      // Fight report: damage dealt by source ('slot:<slot>' for an item's hits and effects, or a status/kind),
      // plus what this fighter took, blocked with Shield, healed and gained.
      stats: { dealt: {}, taken: 0, blocked: 0, healed: 0, lifesteal: 0, regen: 0, shield: 0, hits: 0, crits: 0, missed: 0, fatigue: 0 }, clutchShield: 0,
    };
    for (const slot of SLOT_ORDER) {
      const e = build.equip[slot];
      if (!e) continue;
      const def = ITEMS[e.id];
      // Scroll steps and cube lines (upgrades.js) adjust a per-fighter copy, never the shared def.
      const m = itemMods(e);
      // Socketed gems: each one's effect for this kind of item (weapon, armour or jewellery).
      const gfx = gemsOf(e).map(id => { const g = GEMS[id]; if (g.school) f.schools[g.school] = (f.schools[g.school] || 0) + 1; return g.fx[gemKind(def)]; });
      const sum = k => gfx.reduce((a, x) => a + (x[k] ?? 0), 0);
      const tier = Math.min(3, Math.max(1, e.tier ?? 1));
      const tm = tierMult(def, tier);
      const boost = gfx.reduce((a, x) => a * (x.boost ?? 1), 1) * tm;
      const quick = gfx.filter(x => x.quick).length;
      const it = {
        def, slot, data: {}, busy: false, timer: 0, boost,
        echo: 1 - gfx.reduce((a, x) => a * (1 - (x.echo ?? 0)), 1),
        cd: def.cd ? def.cd * (1 - m.cdPct / 100) * 0.75 ** quick * (tier === 3 ? GOLD_CD : 1) : 0,
      };
      if (quick && !def.cd) f.gemSpd += 4 * quick;
      f.items.push(it);
      f.maxHp += (def.hp || 0) * boost + m.hp + sum('hp');
      f.luck += m.luck + sum('luck');
      f.ls += m.ls / 100;
      for (const k in f.start) f.start[k] += m[k] ?? 0;
      f.clutchShield += m.clutchShield;
      for (const x of gfx) {
        for (const k in x.start ?? {}) f.start[k] += x.start[k];
        for (const k in x.capBonus ?? {}) f.capBonus[k] = (f.capBonus[k] ?? 0) + x.capBonus[k];
        for (const k of ['freezeBonus', 'thornsBonus', 'healPct', 'lowDmgPct', 'selfCatalyst']) f[k] += x[k] ?? 0;
        // A gem's own triggered effects ride along as a companion of its item (same slot, same boost).
        if (x.hooks) f.items.push({ def: { hooks: x.hooks, schools: [] }, slot, data: {}, busy: false, timer: 0, boost, gem: true });
      }
      if (def.stats) { f.luck += Math.round((def.stats.luck || 0) * tm); }
      // Jewellery starters (items.js): Luck and Lifesteal now, the rest at the start of the fight. Tiers scale them.
      for (let [k, v] of Object.entries(def.starter ?? {})) {
        v = k === 'ls' ? v * tm : Math.round(v * tm);
        if (k === 'luck') f.luck += v;
        else if (k === 'ls') f.ls += v / 100;
        else f.start[k] += v;
      }
      if (def.flags) Object.assign(f.flags, def.flags);
      const tune = w => ({
        ...w, dmg: w.dmg * tm * (1 + (m.dmgPct + sum('dmgPct')) / 100), interval: w.interval * (1 - (m.spdPct + sum('spdPct')) / 100), extra: m.onHit,
        ls: (w.ls || 0) + sum('ls'), critBonus: sum('critBonus'), catalyst: sum('catalyst'),
        echoHits: Math.min(Infinity, ...gfx.map(x => x.echoHits ?? Infinity)),
        gemHit: gfx.filter(x => x.hit).map(x => ({ fn: x.hit, data: {}, slot, boost })),
      });
      if (def.weapon) f.weapons.push({ it, w: tune(def.weapon), timer: 0, main: true, slot });
      if (def.dual) f.weapons.push({ it, w: tune(def.dual), timer: 0, main: false, slot });
      if (def.cd) f.cds.push(it);
      for (const s of def.schools) if (s !== 'Prismatic') f.schools[s] = (f.schools[s] || 0) + 1;
    }
    if (f.gemSpd) for (const wp of f.weapons) wp.w.interval *= 1 - Math.min(30, f.gemSpd) / 100;
    // Trinkets that trade weapon speed for an effect (Anchor Chain).
    const slowW = f.items.reduce((m, it) => m * (it.def.weaponSlow ?? 1), 1);
    if (slowW !== 1) for (const wp of f.weapons) wp.w.interval *= slowW;
    if (!f.weapons.some(w => w.main)) f.weapons.unshift({ it: null, w: { interval: 1.5, dmg: 1, hands: 1 }, timer: 0, main: true, slot: 'weapon' });
    if (build.hp) f.maxHp = build.hp;
    f.hp = f.maxHp;
    return f;
  }
  const A = makeFighter('A', buildA);
  const B = makeFighter('B', buildB);
  const other = f => (f === A ? B : A);

  /* ---------- hooks and modifiers ---------- */
  function fire(f, name, payload = {}) {
    if (!f || f.dead) return;
    for (const it of f.items) {
      const h = it.def.hooks?.[name];
      if (!h || it.busy) continue;
      it.busy = true;
      let did = false;
      try {
        did = h(ctx(f, it), payload);
        // Echo gem: a chance for the item's effect to happen again.
        if (did && it.echo && rng() < it.echo) h(ctx(f, it), payload);
      } finally { it.busy = false; }
      if (did) ev('trigger', { side: f.side, slot: it.slot });
    }
  }
  function mod(f, name, v, payload) {
    for (const it of f.items) {
      const h = it.def.mods?.[name];
      if (h) v = h(ctx(f, it), v, payload ?? {});
    }
    return v;
  }
  const luckOf = f => mod(f, 'luck', f.luck);
  function chance(f, p) {
    const ok = rng() < Math.min(1, p + 0.03 * luckOf(f));
    if (!ok && f.flags.loadedDice && f.diceLuck < 10) { f.diceLuck++; f.luck += 1; }
    return ok;
  }
  const critRoll = f => chance(f, 0.05);
  const speed = f => (f.frozen > 0 ? 0 : Math.min(2.5, Math.max(0.4, 1 + 0.03 * f.heat - 0.03 * f.st.slow)) * (f.berserk > 0 ? f.berserkSpd : 1));

  function weightedPick(f, options, schoolOf) {
    const w = options.map(o => (f.flags.foolsOpal ? 1 : 1 + (f.schools[schoolOf(o)] || 0)));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { if ((r -= w[i]) < 0) return options[i]; }
    return options[options.length - 1];
  }
  const pickStatus = (f, exclude) => weightedPick(f, STATUSES.filter(s => s !== exclude), s => STATUS_SCHOOL[s]);

  /* ---------- core actions ---------- */
  function checkClutch(f) {
    // One-time HP thresholds for trinkets: hp50 and hp40 fire once each on the way down.
    for (const p of [50, 40]) {
      if (!f.below[p] && !f.dead && f.hp > 0 && f.hp < f.maxHp * (p / 100)) { f.below[p] = true; fire(f, `hp${p}`); }
    }
    if (!f.clutch && !f.dead && f.hp > 0 && f.hp < f.maxHp * 0.3) {
      f.clutch = true;
      ev('clutch', { side: f.side });
      fire(f, 'clutch');
      if (f.clutchShield) gain(f, 'shield', f.clutchShield);
    }
  }
  // Nomad's Wrap taxes weapon hits only. Burn and Poison are how you hit someone through Sand.
  function incoming(src, tgt, n) {
    if (src && src !== tgt && tgt.flags.sandTax && src.st.sand >= 10) return n * 0.85;
    return n;
  }
  function damage(src, tgt, n, kind, meta = {}) {
    if (!(n > 0) || tgt.dead) return 0;
    // Stasis blocks all damage.
    if (tgt.stasis > 0) return 0;
    if (tgt.berserk > 0) n *= tgt.berserkTaken;
    if (kind === 'hit') n = incoming(src, tgt, n);
    let absorbed = 0;
    if (kind !== 'poison' && kind !== 'fatigue' && kind !== 'self') {
      absorbed = Math.min(tgt.shield, n);
      if (absorbed > 0) {
        tgt.shield -= absorbed;
        if (tgt.shield < 0.05) { tgt.shield = 0; fire(tgt, 'shieldBreak'); }
      }
    }
    tgt.hp -= n - absorbed;
    tgt.stats.taken += n - absorbed;
    tgt.stats.blocked += absorbed;
    if (!src) tgt.stats.fatigue += n;
    else if (src !== tgt) credit(src, kind === 'hit' || kind === 'pure' ? (meta.slot ? `slot:${meta.slot}` : 'other') : kind, n);
    ev('dmg', { side: tgt.side, n: r1(n), kind, absorbed: r1(absorbed), crit: !!meta.crit });
    if (src && src !== tgt && src.flags.chalice && kind !== 'hit' && kind !== 'self' && kind !== 'burn' && kind !== 'poison') {
      const ls = mod(src, 'lifesteal', src.ls, { d: tgt });
      if (ls > 0) heal(src, n * ls, { ls: true });
    }
    checkClutch(tgt);
    return n;
  }
  function credit(f, key, n) { f.stats.dealt[key] = (f.stats.dealt[key] ?? 0) + n; }
  function heal(f, n, o = {}) {
    if (!(n > 0) || f.dead) return false;
    n = mod(f, 'heal', n) * (1 + f.healPct / 100);
    if (f.st.burn > 0) n *= BURN_HEAL_CUT;
    if (f.flags.healCrit && critRoll(f)) n *= 2;
    const room = Math.max(0, f.maxHp - f.hp);
    const real = Math.min(room, n);
    let over = n - real;
    f.hp += real;
    f.stats.healed += real;
    if (o.ls) f.stats.lifesteal += real;
    if (o.regen) f.stats.regen += real;
    ev('heal', { side: f.side, n: r1(n), ls: !!o.ls });
    if (over > 0.05) {
      if (f.flags.reliquary) { f.maxHp += over; f.hp += over; over = 0; }
      if (over > 0.05) fire(f, 'overheal', { over, ls: !!o.ls });
    }
    fire(f, 'healed', { n, ls: !!o.ls });
    return true;
  }
  function gain(f, type, n) {
    if (!(n > 0) || f.dead) return false;
    if (type === 'shield') {
      if (f.flags.shieldCrit && critRoll(f)) n *= 2;
      f.shield += n;
      f.stats.shield += n;
      ev('shield', { side: f.side, n: r1(n) });
      fire(f, 'gainedShield', { n });
    } else if (type === 'heat') {
      const c = Math.min(f.st.slow, n);
      f.st.slow -= c;
      n -= c;
      const cap = f.flags.molten ? Infinity : HEAT_CAP;
      const add = Math.min(n, Math.max(0, cap - f.heat));
      if (add <= 0) return c > 0;
      f.heat += add;
      ev('boon', { side: f.side, k: 'heat', n: add });
      fire(f, 'gainedHeat', { n: add });
    } else if (type === 'thorns') {
      const add = Math.min(n, Math.max(0, THORNS_CAP - f.thorns));
      if (add <= 0) return false;
      f.thorns += add;
      ev('boon', { side: f.side, k: 'thorns', n: add });
    } else if (type === 'regen') {
      const add = Math.min(n, Math.max(0, REGEN_CAP - f.regen));
      if (add <= 0) return false;
      f.regen += add;
      ev('boon', { side: f.side, k: 'regen', n: add });
      fire(f, 'gainedRegen', { n: add });
    } else if (type === 'luck') {
      f.luck += n;
      ev('boon', { side: f.side, k: 'luck', n });
    } else if (type === 'ls') {
      f.ls += n;
      ev('boon', { side: f.side, k: 'ls', n });
    }
    return true;
  }
  function freeze(tgt, dur, force, src) {
    if (tgt.dead || (!force && tgt.thaw > 0)) return false;
    tgt.frozen = Math.max(tgt.frozen, dur + (src?.freezeBonus ?? 0));
    tgt.thaw = 0;
    tgt.st.frost = 0;
    ev('freeze', { side: tgt.side, dur });
    fire(src, 'enemyFreezeFirst');
    fire(src, 'enemyFreeze');
    return true;
  }
  function apply(src, tgt, type, n, o = {}) {
    if (tgt.dead) return false;
    // Rainbow Prism: some of the statuses in its pool you apply (Burn, Poison, Slow) turn into a random one of them, and sometimes one splashes back on you.
    // Frost (a meter) and Sand (weakest per stack, so swapping it is pure gain) stay out.
    const rb = src.flags.rainbow;
    if (rb && !o.generated && src !== tgt && rb.pool.includes(type) && rng() < rb.chance) {
      const pool = rb.pool;
      const to = pool[Math.floor(rng() * pool.length)];
      // mode 'cap' converts at the same share of the cap (3 Slow is about 1 Burn); fractions round up or down by chance.
      const x = n * (rb.mode === 'cap' ? capOf(src, to) / capOf(src, type) : 1) * (1 + rb.bonus);
      n = Math.floor(x) + (rng() < x - Math.floor(x) ? 1 : 0);
      type = to;
      if (rng() < rb.self) apply(tgt, src, pool[Math.floor(rng() * pool.length)], 1, { generated: true });
    }
    n = Math.round(mod(src, 'applyN', n, { type }));
    if (n <= 0) return false;
    if (src.flags.statusCrit && critRoll(src)) n *= 2;
    if (type === 'frost') {
      if (tgt.thaw > 0 || tgt.frozen > 0) return false;
      tgt.st.frost += n;
      ev('status', { side: tgt.side, st: type, n, by: src.side, cause });
      if (tgt.st.frost >= 10) freeze(tgt, FREEZE_TIME, false, src);
    } else {
      if (type === 'slow') {
        const c = Math.min(tgt.heat, n);
        tgt.heat -= c;
        tgt.st.slow = Math.min(capOf(src, 'slow'), tgt.st.slow + n - c);
      } else if (type === 'sand') {
        tgt.st.sand = Math.min(capOf(src, 'sand'), tgt.st.sand + n);
      } else if (type === 'poison' || type === 'burn') {
        n = Math.min(n, Math.max(0, capOf(src, type) - tgt.st[type]));
        if (n <= 0) return false;
        tgt.st[type] += n;
      } else {
        tgt.st[type] += n;
      }
      ev('status', { side: tgt.side, st: type, n, by: src.side, cause });
    }
    if (!o.generated) {
      fire(src, 'applied', { type, n });
      if (src.flags.prismHeart) apply(src, tgt, pickStatus(src, type), Math.ceil(n / 2), { generated: true });
    }
    return true;
  }
  // Thorns: the owner strikes back for their Thorns stacks. Thorns damage is not a weapon hit,
  // so it never triggers on-hit or when-hit effects, and two Thorns fighters can't loop.
  // pulse is Ironbark's timer. It still strikes, and bridge rings still notice, but it does not grow Thorns.
  function thornsStrike(owner, tgt, pulse) {
    if (owner.dead || tgt.dead || !(owner.thorns > 0)) return false;
    let n = owner.thorns + owner.thornsBonus;
    let crit = false;
    if (owner.flags.thornCrit && critRoll(owner)) { n *= 2; crit = true; }
    ev('thorns', { side: owner.side });
    damage(owner, tgt, n, 'thorns', { crit });
    fire(owner, 'thorned', { dmg: n, pulse: !!pulse });
    return true;
  }
  // Statuses never wear off; caps keep them in check. Wildfire lifts its owner's Burn cap.
  function capOf(src, type) {
    const bonus = src.capBonus[type] ?? 0;
    if (type === 'burn') return (src.flags.wildfire ? BURN_CAP_WILDFIRE : BURN_CAP) + bonus;
    return ({ poison: POISON_CAP, slow: SLOW_CAP, sand: SAND_CAP }[type] ?? Infinity) + bonus;
  }
  // Cleanse: remove stacks from your biggest debuff (Burn, Poison, Slow or Sand; not the Frost meter), one at a time. Mirror of the Moon sends them back.
  function cleanse(f, n) {
    if (f.dead || !(n > 0)) return 0;
    const removed = {};
    let total = 0;
    for (let i = 0; i < n; i++) {
      let best = null;
      for (const k of ['burn', 'poison', 'slow', 'sand']) if (f.st[k] > 0 && (!best || f.st[k] > f.st[best])) best = k;
      if (!best) break;
      f.st[best]--;
      removed[best] = (removed[best] ?? 0) + 1;
      total++;
    }
    if (!total) return 0;
    ev('cleanse', { side: f.side, n: total });
    if (f.flags.moonMirror) for (const [k, m] of Object.entries(removed)) apply(f, other(f), k, m, { generated: true });
    fire(f, 'cleansed', { n: total, removed });
    return total;
  }
  // Haste: your weapons and cooldown items tick 50% faster while it lasts (stacks up to HASTE_MAX seconds).
  function haste(f, secs) {
    if (f.dead || !(secs > 0)) return false;
    f.haste = Math.min(HASTE_MAX, f.haste + secs);
    ev('haste', { side: f.side, n: r1(secs) });
    fire(f, 'hasted', { secs });
    return true;
  }
  // Charge: advance a cooldown by some seconds, so it fires sooner (at most on the next tick).
  // what: 'weapon', 'offhand', 'items' (every other cooldown item) or 'random' (one other cooldown item, else the weapon).
  function charge(f, what, secs, self) {
    if (f.dead || !(secs > 0)) return false;
    const items = f.cds.filter(it => it !== self);
    const weapons = f.weapons.filter(w => w.it || w.main);
    let targets = [];
    if (what === 'weapon') targets = weapons.filter(w => w.main);
    else if (what === 'offhand') targets = [...items.filter(it => it.slot === 'offhand'), ...weapons.filter(w => !w.main)];
    else if (what === 'items') targets = items;
    else if (what === 'random') targets = items.length ? [items[Math.floor(rng() * items.length)]] : weapons.filter(w => w.main);
    if (!targets.length) return false;
    for (const t of targets) {
      if (t.w) t.timer = Math.min(t.timer + secs, t.w.interval);
      else t.timer = Math.min(t.timer + secs, t.cd);
      ev('charge', { side: f.side, slot: t.slot, n: r1(secs) });
    }
    return true;
  }
  function regenTick(f) {
    let n = f.regen;
    if (f.flags.regenCrit && critRoll(f)) n *= 2;
    heal(f, n, { regen: true });
    fire(f, 'regenTick', { n });
  }
  function boon(f) {
    const b = weightedPick(f, BOONS, x => x.school);
    const k = f.flags.foolsOpal ? 2 : 1;
    if (b.k === 'heal') return heal(f, 8 * k);
    if (b.k === 'shield') return gain(f, 'shield', 8 * k);
    if (b.k === 'heat') return gain(f, 'heat', 2 * k);
    if (b.k === 'luck') return gain(f, 'luck', 2 * k);
    if (b.k === 'thorns') return gain(f, 'thorns', 2 * k);
    if (b.k === 'regen') return gain(f, 'regen', 2 * k);
    return gain(f, 'ls', 0.03 * k);
  }

  function ctx(me, it, foeOverride) {
    const foe = foeOverride ?? other(me);
    // Hollow gem: this item's amounts are boosted. Whole-number amounts round up or down by chance, so +40% on 1 still counts.
    const b = it?.boost ?? 1;
    const ampF = n => n * b;
    const ampI = n => { if (b === 1) return n; const x = n * b, lo = Math.floor(x); return lo + (rng() < x - lo ? 1 : 0); };
    return {
      me, foe, data: it ? it.data : {}, t,
      rng,
      apply: (type, n) => apply(me, foe, type, ampI(n)),
      addRaw: (type, n) => {
        if (type === 'poison' || type === 'burn') n = Math.min(n, Math.max(0, capOf(me, type) - foe.st[type]));
        if (!(n > 0)) return false;
        foe.st[type] += n;
        ev('status', { side: foe.side, st: type, n });
        return true;
      },
      gain: (type, n) => gain(me, type, type === 'shield' || type === 'ls' ? ampF(n) : ampI(n)),
      heal: n => heal(me, ampF(n)),
      hit: n => damage(me, foe, ampF(n), 'pure', { slot: it?.slot }) > 0,
      selfDamage: n => damage(me, me, n, 'self') > 0,
      chance: p => chance(me, p),
      freeze: dur => freeze(foe, dur, true, me),
      pickStatus: ex => pickStatus(me, ex),
      randomStatus: n => apply(me, foe, pickStatus(me), n * (me.flags.foolsOpal ? 2 : 1)),
      randomBoon: () => boon(me),
      luck: () => luckOf(me),
      thorns: pulse => thornsStrike(me, foe, pulse),
      cleanse: n => cleanse(me, ampI(n)),
      freezeFoe: dur => freeze(foe, dur, false, me),
      pure: n => damage(me, foe, n, 'pure', { slot: it?.slot }),
      moment: (k, data = {}) => ev('moment', { side: me.side, k, ...data }),
      haste: secs => haste(me, ampF(secs)),
      charge: (what, secs) => charge(me, what, ampF(secs), it),
      capOf: type => capOf(me, type),
    };
  }

  const statusTypes = f => STATUSES.reduce((n, k) => n + (f.st[k] > 0 ? 1 : 0), 0);
  function attack(a, d, wp) {
    const w = wp.w;
    ev('attack', { side: a.side, slot: wp.slot, main: wp.main });
    if (d.stasis > 0) { ev('immune', { side: d.side }); return; }
    const miss = rng() < 0.04 * a.st.sand;
    fire(d, 'attacked', { miss });
    if (miss) {
      a.stats.missed++;
      ev('miss', { side: d.side });
      fire(d, 'enemyMiss');
      if (d.flags.mirage) {
        ev('reflect', { side: a.side });
        damage(d, a, w.dmg, 'reflect');
        if (w.onHit) w.onHit(ctx(a, wp.it, a));
        for (const x of w.extra ?? []) apply(d, a, x.type, x.n);
      }
      return;
    }
    let crit;
    if (a.autoCrit > 0) { crit = true; a.autoCrit--; }
    else if (a.flags.shatter && d.frozen > 0) crit = true;
    else crit = critRoll(a) || (w.critBonus > 0 && rng() < w.critBonus);
    let dmg = w.dmg + (w.catalyst ? w.catalyst * statusTypes(d) : 0);
    if (a.lowDmgPct && a.hp < a.maxHp * 0.5) dmg *= 1 + a.lowDmgPct / 100;
    if (a.selfCatalyst) dmg *= 1 + (a.selfCatalyst * statusTypes(a)) / 100;
    if (a.flags.juggernaut) dmg += a.shield * 0.25;
    dmg = mod(a, 'hitDmg', dmg);
    if (crit) dmg *= Math.max(2, w.critMult || 2, mod(a, 'critMult', 2));
    a.stats.hits++;
    if (crit) a.stats.crits++;
    const dealt = damage(a, d, dmg, 'hit', { crit, slot: wp.slot });
    let ls = (w.ls || 0) + mod(a, 'lifesteal', a.ls, { d });
    if (a.fullLs > 0) { ls = 1; a.fullLs--; }
    if (crit && a.flags.knuckles) ls *= 2;
    if (ls > 0 && dealt > 0) {
      heal(a, dealt * ls, { ls: true });
      fire(a, 'lifestole', { n: dealt * ls });
    }
    wp.hits = (wp.hits ?? 0) + 1;
    const onHits = () => {
      if (w.onHit) w.onHit(ctx(a, wp.it));
      for (const x of w.extra ?? []) apply(a, d, x.type, x.n);
      for (const g of w.gemHit ?? []) g.fn(ctx(a, g), { crit, n: wp.hits });
    };
    onHits();
    // Echo gem: every Nth hit, this weapon's on-hit effects happen twice.
    if (wp.hits % w.echoHits === 0) onHits();
    fire(a, 'hit', { crit, main: wp.main });
    if (crit) fire(a, 'crit');
    fire(d, 'whenHit', { dmg: dealt });
    if (d.thorns > 0 && !d.dead) thornsStrike(d, a);
  }

  // Continuous damage over time: Burn deals its stacks per second and Poison its stacks per POISON_EVERY seconds,
  // spread evenly across ticks of DT. Burn hits Shield first; Poison ignores it.
  function drain(f, kind, n) {
    if (f.dead || !(n > 0)) return;
    let absorbed = 0;
    if (kind === 'burn' && f.shield > 0) {
      absorbed = Math.min(f.shield, n);
      f.shield -= absorbed;
      if (f.shield < 0.05) { f.shield = 0; fire(f, 'shieldBreak'); }
    }
    f.hp -= n - absorbed;
    f.stats.taken += n - absorbed;
    f.stats.blocked += absorbed;
    credit(other(f), kind, n);
    f.tick[kind] += n;
    f.shown[kind] += n;
    checkClutch(f);
  }
  // The 1s Burn tick: hooks and crits (a crit repeats that second's Burn as a bonus hit). Burn no longer decays.
  function burnTick(f) {
    const src = other(f);
    let dmg = f.tick.burn;
    f.tick.burn = 0;
    if (dmg > 0 && src.flags.burnCrit && critRoll(src)) { damage(src, f, dmg, 'burn', { crit: true }); dmg *= 2; }
    if (dmg > 0 && src.flags.chalice) chaliceHeal(src, f, dmg);
    if (dmg > 0) ev('dotTick', { side: f.side, kind: 'burn', n: r1(dmg) });
    fire(src, 'burnTick', { dmg });
  }
  function poisonTick(f) {
    const src = other(f);
    f.poisonTicks++;
    let dmg = f.tick.poison;
    f.tick.poison = 0;
    if (dmg > 0 && src.flags.poisonCrit && critRoll(src)) {
      damage(src, f, dmg, 'poison', { crit: true });
      dmg *= 2;
    }
    // Serpent adds a bite on top of the drain. Replacing the drain made short fights deal nothing.
    let strike = 0;
    if (src.flags.serpent && f.poisonTicks % 5 === 0 && f.st.poison > 0) {
      strike = f.st.poison * 5;
      const crit = critRoll(src);
      if (crit) strike *= 2;
      damage(src, f, strike, 'poison', { crit });
    }
    const total = dmg + strike;
    if (total > 0 && src.flags.chalice) chaliceHeal(src, f, total);
    if (dmg > 0) ev('dotTick', { side: f.side, kind: 'poison', n: r1(dmg) });
    fire(src, 'poisonTick', { dmg: total });
  }
  function chaliceHeal(src, tgt, n) {
    const ls = mod(src, 'lifesteal', src.ls, { d: tgt });
    if (ls > 0) heal(src, n * ls, { ls: true });
  }

  function snapshot() {
    const s = f => ({
      hp: Math.max(0, r1(f.hp)), maxHp: r1(f.maxHp), shield: r1(f.shield),
      st: { ...f.st }, heat: f.heat, luck: luckOf(f), thorns: f.thorns, regen: f.regen, frozen: f.frozen > 0, gold: f.stasis > 0, berserk: f.berserk > 0, haste: f.haste > 0,
      cds: [
        ...f.weapons.map(w => ({ slot: w.slot, p: Math.min(1, w.timer / w.w.interval) })),
        ...f.cds.map(it => ({ slot: it.slot, p: Math.min(1, it.timer / it.cd) })),
      ],
    });
    frames.push({ t: r1(t), A: s(A), B: s(B) });
  }

  /* ---------- main loop ---------- */
  for (const f of [A, B]) {
    const s = f.start;
    if (s.shield) gain(f, 'shield', s.shield);
    if (s.heat) gain(f, 'heat', s.heat);
    if (s.slow) apply(f, other(f), 'slow', s.slow, { generated: true });
    if (s.sand) apply(f, other(f), 'sand', s.sand, { generated: true });
    if (s.poison) apply(f, other(f), 'poison', s.poison, { generated: true });
    if (s.burn) apply(f, other(f), 'burn', s.burn, { generated: true });
    if (s.frost) apply(f, other(f), 'frost', s.frost, { generated: true });
    for (let i = 0; i < s.random; i++) apply(f, other(f), pickStatus(f), 1, { generated: true });
    if (s.thorns) gain(f, 'thorns', s.thorns);
    if (s.regen) gain(f, 'regen', s.regen);
  }
  snapshot();
  fire(A, 'start');
  fire(B, 'start');
  let result = null;
  let tick = 0;
  while (!result) {
    tick++;
    t = r1(tick * DT);
    for (const f of [A, B]) {
      const src = other(f);
      if (f.stasis > 0) { /* gold: Burn and Poison wait */ } else if (f.st.burn > 0) drain(f, 'burn', (f.st.burn + (src.flags.ashen ? Math.floor(src.heat / 5) : 0)) * (src.flags.wildfire && src.heat >= WILDFIRE_AT ? 1.25 : 1) * BURN_PER * DT);
      if (f.st.poison > 0 && !(f.stasis > 0)) drain(f, 'poison', (f.st.poison / POISON_EVERY) * DT);
      f.burnT += DT;
      if (f.burnT >= 0.999) { f.burnT -= 1; if (f.st.burn > 0 || f.tick.burn > 0) burnTick(f); }
      f.poisonT += DT;
      if (f.poisonT >= POISON_EVERY - 0.001) { f.poisonT -= POISON_EVERY; if (f.st.poison > 0 || f.tick.poison > 0) poisonTick(f); }
      f.regenT += DT;
      if (f.regenT >= REGEN_EVERY - 0.001) { f.regenT -= REGEN_EVERY; if (f.regen > 0) regenTick(f); }
      // Report the drained damage twice a second, so the UI can float small numbers at a calm pace.
      if (tick % 5 === 0) {
        for (const k of ['burn', 'poison']) {
          if (f.shown[k] >= 1) { ev('dmg', { side: f.side, n: r1(f.shown[k]), kind: k, absorbed: 0, dot: true }); f.shown[k] = 0; }
        }
      }
      if (f.stasis > 0) f.stasis = Math.max(0, f.stasis - DT);
      if (f.haste > 0) f.haste = Math.max(0, f.haste - DT);
      if (f.berserk > 0) f.berserk = Math.max(0, f.berserk - DT);
      f.hist.push(f.hp);
      if (f.hist.length > 31) f.hist.shift();
      if (f.frozen > 0) {
        f.frozen = Math.max(0, f.frozen - DT);
        if (f.frozen === 0) { f.thaw = 2; ev('thaw', { side: f.side }); }
      } else if (f.thaw > 0) {
        f.thaw = Math.max(0, f.thaw - DT);
      }
    }
    const order = tick % 2 ? [A, B] : [B, A];
    for (const f of order) {
      if (f.dead || f.hp <= 0) continue;
      const sp = speed(f) * DT * (f.haste > 0 ? HASTE_SPEED : 1);
      if (!sp) continue;
      for (const wp of f.weapons) {
        if (f.stasis > 0) continue;
        wp.timer += sp;
        if (wp.timer >= wp.w.interval) {
          wp.timer -= wp.w.interval;
          attack(f, other(f), wp);
        }
      }
      for (const it of f.cds) {
        it.timer += sp;
        if (it.timer >= it.cd) {
          it.timer -= it.cd;
          ev('trigger', { side: f.side, slot: it.slot, cast: true });
          it.busy = true;
          cause = 'item';
          try {
            it.def.act(ctx(f, it));
            if (it.echo && rng() < it.echo) it.def.act(ctx(f, it));
          } finally { it.busy = false; cause = 'other'; }
          fire(f, 'itemFired', { slot: it.slot });
        }
      }
    }
    if (Math.abs(t - Math.round(t)) < 1e-6) {
      for (const f of [A, B]) fire(f, 'second');
      if (t >= FATIGUE_AT) {
        const n = t - FATIGUE_AT + 1;
        ev('fatigue', { n });
        for (const f of [A, B]) damage(null, f, n, 'fatigue');
      }
    }
    const aDead = A.hp <= 0, bDead = B.hp <= 0;
    if (aDead) A.dead = true;
    if (bDead) B.dead = true;
    snapshot();
    if (aDead && bDead) result = 'draw';
    else if (aDead) result = 'B';
    else if (bDead) result = 'A';
    else if (t >= maxTime) result = 'draw';
  }
  ev('end', { result });
  return { result, duration: t, frames, events, stats: { A: A.stats, B: B.stats } };
}
