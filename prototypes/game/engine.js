// Deterministic combat simulation, following the design doc's keyword rules.
// simulate() runs a whole fight up front and returns per-tick frames and an event list for playback.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 0.1;
const HEAT_CAP = 20, SAND_CAP = 15, SLOW_CAP = 25;
const FATIGUE_AT = 25, MAX_TIME = 75;
const POISON_EVERY = 3, BURN_HEAL_CUT = 0.8, FREEZE_TIME = 2;
// Shared with the UI so status explanations always match the engine.
export const RULES = { HEAT_CAP, SAND_CAP, SLOW_CAP, FATIGUE_AT, POISON_EVERY, BURN_HEAL_CUT, FREEZE_TIME, THAW_TIME: 2, FREEZE_AT: 10, SAND_MISS: 0.04, SPEED_PER: 0.03, BASE_CRIT: 0.05, LUCK_PER: 0.03 };
const STATUSES = ['burn', 'poison', 'frost', 'slow', 'sand'];
const STATUS_SCHOOL = { burn: 'Fire', poison: 'Venom', frost: 'Frost', slow: 'Frost', sand: 'Desert' };
const BOONS = [
  { k: 'heal', school: 'Holy' }, { k: 'shield', school: 'Holy' }, { k: 'heat', school: 'Fire' },
  { k: 'luck', school: 'Fortune' }, { k: 'ls', school: 'Blood' },
];
const SLOT_ORDER = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
const r1 = n => Math.round(n * 10) / 10;

export function simulate(buildA, buildB, ITEMS, seed = 1) {
  const rng = mulberry32(seed >>> 0);
  let t = 0;
  const events = [];
  const frames = [];
  const ev = (type, data) => events.push({ t: r1(t), type, ...data });

  function makeFighter(side, build) {
    const f = {
      side, name: build.name, hp: 0, maxHp: 100, shield: 0,
      st: { burn: 0, poison: 0, frost: 0, slow: 0, sand: 0 },
      heat: 0, luck: 0, ls: 0, frozen: 0, thaw: 0, clutch: false, dead: false,
      flags: {}, items: [], weapons: [], cds: [], schools: {},
      fullLs: 0, autoCrit: 0, diceLuck: 0, sandHold: 0,
      burnT: 0, poisonT: 0, slowT: 0, sandT: 0, poisonTicks: 0,
    };
    for (const slot of SLOT_ORDER) {
      const e = build.equip[slot];
      if (!e) continue;
      const def = ITEMS[e.id];
      const it = { def, slot, data: {}, busy: false, timer: 0 };
      f.items.push(it);
      f.maxHp += def.hp || 0;
      if (def.stats) { f.luck += def.stats.luck || 0; }
      if (def.flags) Object.assign(f.flags, def.flags);
      if (def.weapon) f.weapons.push({ it, w: def.weapon, timer: 0, main: true, slot });
      if (def.dual) f.weapons.push({ it, w: def.dual, timer: 0, main: false, slot });
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
    ev('dmg', { side: tgt.side, n: r1(n), kind, absorbed: r1(absorbed), crit: !!meta.crit });
    if (src && src !== tgt && src.flags.chalice && kind !== 'hit' && kind !== 'self') {
      const ls = mod(src, 'lifesteal', src.ls, { d: tgt });
      if (ls > 0) heal(src, n * ls, { ls: true });
    }
    checkClutch(tgt);
    return n;
  }
  function heal(f, n, o = {}) {
    if (!(n > 0) || f.dead) return false;
    n = mod(f, 'heal', n);
    if (f.st.burn > 0) n *= BURN_HEAL_CUT;
    if (f.flags.healCrit && critRoll(f)) n *= 2;
    const room = Math.max(0, f.maxHp - f.hp);
    const real = Math.min(room, n);
    let over = n - real;
    f.hp += real;
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
      ev('shield', { side: f.side, n: r1(n) });
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
      ev('status', { side: tgt.side, type, n });
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
      ev('status', { side: tgt.side, type, n });
    }
    if (!o.generated) {
      fire(src, 'applied', { type, n });
      if (src.flags.prismHeart) apply(src, tgt, pickStatus(src, type), Math.ceil(n / 2), { generated: true });
    }
    return true;
  }
  function boon(f) {
    const b = weightedPick(f, BOONS, x => x.school);
    const k = f.flags.foolsOpal ? 2 : 1;
    if (b.k === 'heal') return heal(f, 8 * k);
    if (b.k === 'shield') return gain(f, 'shield', 8 * k);
    if (b.k === 'heat') return gain(f, 'heat', 2 * k);
    if (b.k === 'luck') return gain(f, 'luck', 2 * k);
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
      hit: n => damage(me, foe, n, 'pure') > 0,
      selfDamage: n => damage(me, me, n, 'self') > 0,
      chance: p => chance(me, p),
      freeze: dur => freeze(foe, dur, true, me),
      pickStatus: ex => pickStatus(me, ex),
      randomStatus: n => apply(me, foe, pickStatus(me), n * (me.flags.foolsOpal ? 2 : 1)),
      randomBoon: () => boon(me),
      luck: () => luckOf(me),
    };
  }

  function attack(a, d, wp) {
    const w = wp.w;
    ev('attack', { side: a.side, slot: wp.slot, main: wp.main });
    const miss = rng() < 0.04 * a.st.sand;
    fire(d, 'attacked', { miss });
    if (miss) {
      ev('miss', { side: d.side });
      fire(d, 'enemyMiss');
      if (d.flags.mirage) {
        ev('reflect', { side: a.side });
        damage(d, a, w.dmg, 'reflect');
        if (w.onHit) w.onHit(ctx(a, wp.it, a));
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
    const dealt = damage(a, d, dmg, 'hit', { crit });
    let ls = (w.ls || 0) + mod(a, 'lifesteal', a.ls, { d });
    if (a.fullLs > 0) { ls = 1; a.fullLs--; }
    if (crit && a.flags.knuckles) ls *= 2;
    if (ls > 0 && dealt > 0) {
      heal(a, dealt * ls, { ls: true });
      fire(a, 'lifestole', { n: dealt * ls });
    }
    if (w.onHit) w.onHit(ctx(a, wp.it));
    fire(a, 'hit', { crit, main: wp.main });
    if (crit) fire(a, 'crit');
    fire(d, 'whenHit', { dmg: dealt });
  }

  function burnTick(f) {
    const src = other(f);
    let dmg = f.st.burn + (src.flags.ashen ? Math.floor(src.heat / 5) : 0);
    let crit = false;
    if (src.flags.burnCrit && critRoll(src)) { dmg *= 2; crit = true; }
    damage(src, f, dmg, 'burn', { crit });
    fire(src, 'burnTick', { dmg });
    if (!(src.flags.wildfire && src.heat >= 15)) f.st.burn = Math.max(0, f.st.burn - 1);
  }
  function poisonTick(f) {
    const src = other(f);
    f.poisonTicks++;
    let dmg = f.st.poison;
    let crit = false;
    if (src.flags.serpent) {
      if (f.poisonTicks % 5 === 0) { dmg *= 6; if (critRoll(src)) { dmg *= 2; crit = true; } }
      else dmg = 0;
    } else if (src.flags.poisonCrit && critRoll(src)) { dmg *= 2; crit = true; }
    if (dmg > 0) damage(src, f, dmg, 'poison', { crit });
    fire(src, 'poisonTick', { dmg });
  }

  function snapshot() {
    const s = f => ({
      hp: Math.max(0, r1(f.hp)), maxHp: r1(f.maxHp), shield: r1(f.shield),
      st: { ...f.st }, heat: f.heat, luck: luckOf(f), frozen: f.frozen > 0,
      cds: [
        ...f.weapons.map(w => ({ slot: w.slot, p: Math.min(1, w.timer / w.w.interval) })),
        ...f.cds.map(it => ({ slot: it.slot, p: Math.min(1, it.timer / it.def.cd) })),
      ],
    });
    frames.push({ t: r1(t), A: s(A), B: s(B) });
  }

  /* ---------- main loop ---------- */
  snapshot();
  fire(A, 'start');
  fire(B, 'start');
  let result = null;
  let tick = 0;
  while (!result) {
    tick++;
    t = r1(tick * DT);
    for (const f of [A, B]) {
      f.burnT += DT;
      if (f.burnT >= 0.999) { f.burnT -= 1; if (f.st.burn > 0) burnTick(f); }
      f.poisonT += DT;
      if (f.poisonT >= POISON_EVERY - 0.001) { f.poisonT -= POISON_EVERY; if (f.st.poison > 0) poisonTick(f); }
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
        if (it.timer >= it.def.cd) {
          it.timer -= it.def.cd;
          ev('trigger', { side: f.side, slot: it.slot });
          it.busy = true;
          try { it.def.act(ctx(f, it)); } finally { it.busy = false; }
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
  return { result, duration: t, frames, events };
}
