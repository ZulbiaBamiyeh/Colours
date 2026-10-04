// Deterministic combat simulation, following the design doc's keyword rules.
// simulate() runs a whole fight up front and returns per-tick frames and an event list for playback.
import { itemMods } from './upgrades.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 0.1;
const HEAT_CAP = 20, SAND_CAP = 15, SLOW_CAP = 25, THORNS_CAP = 20;
const FATIGUE_AT = 25, MAX_TIME = 75;
const POISON_EVERY = 3, BURN_HEAL_CUT = 0.8, FREEZE_TIME = 2;
// Shared with the UI so status explanations always match the engine.
export const RULES = { THORNS_CAP, THORNS_CAP_HEART: 40, HEAT_CAP, SAND_CAP, SLOW_CAP, FATIGUE_AT, POISON_EVERY, BURN_HEAL_CUT, FREEZE_TIME, THAW_TIME: 2, FREEZE_AT: 10, SAND_MISS: 0.04, SPEED_PER: 0.03, BASE_CRIT: 0.05, LUCK_PER: 0.03 };
const STATUSES = ['burn', 'poison', 'frost', 'slow', 'sand'];
const STATUS_SCHOOL = { burn: 'Fire', poison: 'Venom', frost: 'Frost', slow: 'Frost', sand: 'Desert' };
const BOONS = [
  { k: 'heal', school: 'Holy' }, { k: 'shield', school: 'Holy' }, { k: 'heat', school: 'Fire' },
  { k: 'luck', school: 'Fortune' }, { k: 'ls', school: 'Blood' }, { k: 'thorns', school: 'Thorn' },
];
const SLOT_ORDER = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
const r1 = n => Math.round(n * 10) / 10;

export function simulate(buildA, buildB, ITEMS, seed = 1) {
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
      fullLs: 0, autoCrit: 0, diceLuck: 0, sandHold: 0,
      burnT: 0, poisonT: 0, slowT: 0, sandT: 0, poisonTicks: 0,
      // Burn and Poison drain continuously; tick holds the damage since the last 1s / 3s tick (for hooks and crits),
      // shown holds what the UI hasn't floated yet.
      tick: { burn: 0, poison: 0 }, shown: { burn: 0, poison: 0 },
      start: { shield: 0, heat: 0, slow: 0, sand: 0, thorns: 0 },
      // Fight report: damage dealt by source ('slot:<slot>' for an item's hits and effects, or a status/kind),
      // plus what this fighter took, blocked with Shield, healed and gained.
      stats: { dealt: {}, taken: 0, blocked: 0, healed: 0, lifesteal: 0, shield: 0, hits: 0, crits: 0, missed: 0, fatigue: 0 }, clutchShield: 0,
    };
    for (const slot of SLOT_ORDER) {
      const e = build.equip[slot];
      if (!e) continue;
      const def = ITEMS[e.id];
      // Scroll steps and cube lines (upgrades.js) adjust a per-fighter copy, never the shared def.
      const m = itemMods(e);
      const it = { def, slot, data: {}, busy: false, timer: 0, cd: def.cd ? def.cd * (1 - m.cdPct / 100) : 0 };
      f.items.push(it);
      f.maxHp += (def.hp || 0) + m.hp;
      f.luck += m.luck;
      f.ls += m.ls / 100;
      for (const k in f.start) f.start[k] += m[k];
      f.clutchShield += m.clutchShield;
      if (def.stats) { f.luck += def.stats.luck || 0; }
      if (def.flags) Object.assign(f.flags, def.flags);
      const tune = w => ({ ...w, dmg: w.dmg * (1 + m.dmgPct / 100), interval: w.interval * (1 - m.spdPct / 100), extra: m.onHit });
      if (def.weapon) f.weapons.push({ it, w: tune(def.weapon), timer: 0, main: true, slot });
      if (def.dual) f.weapons.push({ it, w: tune(def.dual), timer: 0, main: false, slot });
      if (def.cd) f.cds.push(it);
      for (const s of def.schools) if (s !== 'Prismatic') f.schools[s] = (f.schools[s] || 0) + 1;
    }
    if (!f.weapons.some(w => w.main)) f.weapons.unshift({ it: null, w: { interval: 1.5, dmg: 1, hands: 1 }, timer: 0, main: true, slot: 'weapon' });
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
      try { did = h(ctx(f, it), payload); } finally { it.busy = false; }
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
  const speed = f => (f.frozen > 0 ? 0 : Math.min(2.5, Math.max(0.4, 1 + 0.03 * f.heat - 0.03 * f.st.slow)));

  function weightedPick(f, options, schoolOf) {
    const w = options.map(o => (f.flags.foolsOpal ? 1 : 1 + (f.schools[schoolOf(o)] || 0)));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { if ((r -= w[i]) < 0) return options[i]; }
    return options[options.length - 1];
  }
  const pickStatus = (f, exclude) => weightedPick(f, STATUSES.filter(s => s !== exclude), s => STATUS_SCHOOL[s]);

  /* ---------- core actions ---------- */
  function checkClutch(f) {
    if (!f.clutch && !f.dead && f.hp > 0 && f.hp < f.maxHp * 0.3) {
      f.clutch = true;
      ev('clutch', { side: f.side });
      fire(f, 'clutch');
      if (f.clutchShield) gain(f, 'shield', f.clutchShield);
    }
  }
  function damage(src, tgt, n, kind, meta = {}) {
    if (!(n > 0) || tgt.dead) return 0;
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
    n = mod(f, 'heal', n);
    if (f.st.burn > 0) n *= BURN_HEAL_CUT;
    if (f.flags.healCrit && critRoll(f)) n *= 2;
    const room = Math.max(0, f.maxHp - f.hp);
    const real = Math.min(room, n);
    let over = n - real;
    f.hp += real;
    f.stats.healed += real;
    if (o.ls) f.stats.lifesteal += real;
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
      const cap = f.flags.briarheart ? RULES.THORNS_CAP_HEART : THORNS_CAP;
      const add = Math.min(n, Math.max(0, cap - f.thorns));
      if (add <= 0) return false;
      f.thorns += add;
      ev('boon', { side: f.side, k: 'thorns', n: add });
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
    tgt.frozen = Math.max(tgt.frozen, dur);
    tgt.thaw = 0;
    tgt.st.frost = 0;
    ev('freeze', { side: tgt.side, dur });
    fire(src, 'enemyFreezeFirst');
    fire(src, 'enemyFreeze');
    return true;
  }
  function apply(src, tgt, type, n, o = {}) {
    if (tgt.dead) return false;
    n = Math.round(mod(src, 'applyN', n, { type }));
    if (n <= 0) return false;
    if (src.flags.statusCrit && critRoll(src)) n *= 2;
    if (type === 'frost') {
      if (tgt.thaw > 0 || tgt.frozen > 0) return false;
      tgt.st.frost += n;
      ev('status', { side: tgt.side, type, n, by: src.side, cause });
      if (tgt.st.frost >= 10) freeze(tgt, FREEZE_TIME, false, src);
    } else {
      if (type === 'slow') {
        const c = Math.min(tgt.heat, n);
        tgt.heat -= c;
        tgt.st.slow = Math.min(SLOW_CAP, tgt.st.slow + n - c);
      } else if (type === 'sand') {
        tgt.st.sand = Math.min(SAND_CAP, tgt.st.sand + n);
      } else {
        tgt.st[type] += n;
      }
      ev('status', { side: tgt.side, type, n, by: src.side, cause });
    }
    if (!o.generated) {
      fire(src, 'applied', { type, n });
      if (src.flags.prismHeart) apply(src, tgt, pickStatus(src, type), Math.ceil(n / 2), { generated: true });
    }
    return true;
  }
  // Thorns: the owner strikes back for their Thorns stacks. Thorns damage is not a weapon hit,
  // so it never triggers on-hit or when-hit effects, and two Thorns fighters can't loop.
  function thornsStrike(owner, tgt) {
    if (owner.dead || tgt.dead || !(owner.thorns > 0)) return false;
    let n = owner.thorns;
    let crit = false;
    if (owner.flags.thornCrit && critRoll(owner)) { n *= 2; crit = true; }
    ev('thorns', { side: owner.side });
    damage(owner, tgt, n, 'thorns', { crit });
    fire(owner, 'thorned', { dmg: n });
    return true;
  }
  function boon(f) {
    const b = weightedPick(f, BOONS, x => x.school);
    const k = f.flags.foolsOpal ? 2 : 1;
    if (b.k === 'heal') return heal(f, 8 * k);
    if (b.k === 'shield') return gain(f, 'shield', 8 * k);
    if (b.k === 'heat') return gain(f, 'heat', 2 * k);
    if (b.k === 'luck') return gain(f, 'luck', 2 * k);
    if (b.k === 'thorns') return gain(f, 'thorns', 2 * k);
    return gain(f, 'ls', 0.03 * k);
  }

  function ctx(me, it, foeOverride) {
    const foe = foeOverride ?? other(me);
    return {
      me, foe, data: it ? it.data : {}, t,
      rng,
      apply: (type, n) => apply(me, foe, type, n),
      addRaw: (type, n) => { foe.st[type] += n; ev('status', { side: foe.side, type, n }); return true; },
      gain: (type, n) => gain(me, type, n),
      heal: n => heal(me, n),
      hit: n => damage(me, foe, n, 'pure', { slot: it?.slot }) > 0,
      selfDamage: n => damage(me, me, n, 'self') > 0,
      chance: p => chance(me, p),
      freeze: dur => freeze(foe, dur, true, me),
      pickStatus: ex => pickStatus(me, ex),
      randomStatus: n => apply(me, foe, pickStatus(me), n * (me.flags.foolsOpal ? 2 : 1)),
      randomBoon: () => boon(me),
      luck: () => luckOf(me),
      thorns: () => thornsStrike(me, foe),
    };
  }

  function attack(a, d, wp) {
    const w = wp.w;
    ev('attack', { side: a.side, slot: wp.slot, main: wp.main });
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
    else crit = critRoll(a);
    let dmg = w.dmg;
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
    if (w.onHit) w.onHit(ctx(a, wp.it));
    for (const x of w.extra ?? []) apply(a, d, x.type, x.n);
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
  // The 1s Burn tick: hooks, crits (a crit repeats that second's Burn as a bonus hit) and decay.
  function burnTick(f) {
    const src = other(f);
    let dmg = f.tick.burn;
    f.tick.burn = 0;
    if (dmg > 0 && src.flags.burnCrit && critRoll(src)) { damage(src, f, dmg, 'burn', { crit: true }); dmg *= 2; }
    if (dmg > 0 && src.flags.chalice) chaliceHeal(src, f, dmg);
    if (dmg > 0) ev('dotTick', { side: f.side, kind: 'burn', n: r1(dmg) });
    fire(src, 'burnTick', { dmg });
    if (!(src.flags.wildfire && src.heat >= 15)) f.st.burn = Math.max(0, f.st.burn - 1);
  }
  function poisonTick(f) {
    const src = other(f);
    f.poisonTicks++;
    let dmg = f.tick.poison;
    f.tick.poison = 0;
    if (src.flags.serpent) {
      dmg = 0;
      if (f.poisonTicks % 5 === 0) {
        let strike = f.st.poison * 6;
        const crit = critRoll(src);
        if (crit) strike *= 2;
        if (strike > 0) damage(src, f, strike, 'poison', { crit });
        dmg = strike;
      }
    } else if (dmg > 0 && src.flags.poisonCrit && critRoll(src)) {
      damage(src, f, dmg, 'poison', { crit: true });
      dmg *= 2;
    }
    if (dmg > 0 && src.flags.chalice) chaliceHeal(src, f, dmg);
    if (dmg > 0 && !src.flags.serpent) ev('dotTick', { side: f.side, kind: 'poison', n: r1(dmg) });
    fire(src, 'poisonTick', { dmg });
  }
  function chaliceHeal(src, tgt, n) {
    const ls = mod(src, 'lifesteal', src.ls, { d: tgt });
    if (ls > 0) heal(src, n * ls, { ls: true });
  }

  function snapshot() {
    const s = f => ({
      hp: Math.max(0, r1(f.hp)), maxHp: r1(f.maxHp), shield: r1(f.shield),
      st: { ...f.st }, heat: f.heat, luck: luckOf(f), thorns: f.thorns, frozen: f.frozen > 0,
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
    if (s.thorns) gain(f, 'thorns', s.thorns);
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
      if (f.st.burn > 0) drain(f, 'burn', (f.st.burn + (src.flags.ashen ? Math.floor(src.heat / 5) : 0)) * DT);
      if (f.st.poison > 0 && !src.flags.serpent) drain(f, 'poison', (f.st.poison / POISON_EVERY) * DT);
      f.burnT += DT;
      if (f.burnT >= 0.999) { f.burnT -= 1; if (f.st.burn > 0 || f.tick.burn > 0) burnTick(f); }
      f.poisonT += DT;
      if (f.poisonT >= POISON_EVERY - 0.001) { f.poisonT -= POISON_EVERY; if (f.st.poison > 0 || f.tick.poison > 0) poisonTick(f); }
      // Report the drained damage twice a second, so the UI can float small numbers at a calm pace.
      if (tick % 5 === 0) {
        for (const k of ['burn', 'poison']) {
          if (f.shown[k] >= 1) { ev('dmg', { side: f.side, n: r1(f.shown[k]), kind: k, absorbed: 0, dot: true }); f.shown[k] = 0; }
        }
      }
      f.slowT += DT;
      if (f.slowT >= 1.999) { f.slowT -= 2; f.st.slow = Math.max(0, f.st.slow - 1); }
      f.sandT += DT;
      if (f.sandT >= 1.999) {
        f.sandT -= 2;
        const hold = f.sandHold > 0 || mod(other(f), 'sandHold', false);
        if (!hold) f.st.sand = Math.max(0, f.st.sand - 1);
      }
      if (f.sandHold > 0) f.sandHold = Math.max(0, f.sandHold - DT);
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
      const sp = speed(f) * DT;
      if (!sp) continue;
      for (const wp of f.weapons) {
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
          try { it.def.act(ctx(f, it)); } finally { it.busy = false; cause = 'other'; }
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
    else if (t >= MAX_TIME) result = 'draw';
  }
  ev('end', { result });
  return { result, duration: t, frames, events, stats: { A: A.stats, B: B.stats } };
}
