// Game screens: the market (shop, bag, equipment, inspector) and battles against ghost builds.
import * as THREE from 'three';
import {
  ITEMS, ITEM_IDS, SLOT_NAME, RARITY_NAME, SCHOOL_VAR, slotLabel, statLine, fitsSlot, rollShopOffers, makeGhost,
} from './items.js';
import {
  USE, isUse, rollUseId, family, STATS, FAMILY_STATS, TIERS, lineText, slotsTotal, slotsLeft, steps, scrollChance,
  applyScroll, applyHammer, rollCube, itemMods, sellBonus, upgradeGhost,
} from './upgrades.js';
import { simulate, mulberry32, RULES } from './engine.js';
import { createStudio, buildHero, dressHero, animateHero, swingPose, pedestal, heroLights, iceBlock, MS, mesh, materialFactory, PixelPass } from './models.js';
import { Particles, Bolts, fighterFx } from './fx.js';

const $ = id => document.getElementById(id);
if (!document.documentElement.lang) document.documentElement.lang = 'en';
// Gear and consumables share one lookup for icons, tooltips and the inspector.
const ALL = { ...ITEMS, ...USE };
const studio = createStudio(ALL);
const iconFor = id => studio.icon(id, S.ttStyle);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rng = mulberry32((Date.now() ^ 0x5eed1e) >>> 0);

const LEFT = ['helm', 'amulet', 'body', 'cape', 'boots'];
const RIGHT = ['weapon', 'offhand', 'gloves', 'ring1', 'ring2'];
const ALL_SLOTS = [...RIGHT, ...LEFT];
const GLYPH = {
  helm: '<path d="M4 15a8 8 0 0 1 16 0v4h-5v-4H9v4H4z"/><path d="M12 7v5"/>',
  amulet: '<path d="M6 3c0 6 2.7 9 6 9s6-3 6-9"/><path d="M12 12l3 4-3 4-3-4z"/>',
  body: '<path d="M9 3h6l5 3-2 5-2-1v11H8V10l-2 1-2-5z"/>',
  cape: '<path d="M8 3h8l1 3 3 15H4L7 6z"/><circle cx="12" cy="5.5" r="1"/>',
  boots: '<path d="M8 3h5v9l6 3v5H8z"/><path d="M8 17h11"/>',
  weapon: '<path d="M20 4l-1 4-9 9-3-3 9-9z"/><path d="M6 13l5 5M4 20l3-3"/>',
  offhand: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  gloves: '<path d="M7 21v-6L5 11l1.5-1L9 12V5a1 1 0 0 1 2 0v5V4a1 1 0 0 1 2 0v6V5a1 1 0 0 1 2 0v6-3a1 1 0 0 1 2 0v7l-2 6z"/>',
  ring1: '<circle cx="12" cy="15" r="5"/><path d="M10 7l2-3 2 3-2 2z"/>',
  ring2: '<circle cx="12" cy="15" r="5"/><path d="M10 7l2-3 2 3-2 2z"/>',
};
const COIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#f4c652" stroke="#9a6a12" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#c98f1e" stroke-width="1.4"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const UNLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';
const HEART = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.2-4.5-9.4-9.3C1.1 7.9 3.3 4.5 6.8 4.5c2 0 3.4 1.1 4.2 2.4.8-1.3 2.2-2.4 4.2-2.4 3.5 0 5.7 3.4 4.2 6.7-2.2 4.8-9.4 9.3-9.4 9.3z" fill="${on ? '#db4d63' : '#1a140f'}" stroke="${on ? '#ff8a9a' : '#6e5532'}" stroke-width="1.4"/></svg>`;
const STATUS_ICON = {
  burn: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 2 0-2 0-3 0-5z"/>',
  poison: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  frost: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/>',
  slow: '<path d="M6 7l6 6 6-6M6 12l6 6 6-6"/>',
  sand: '<circle cx="8" cy="9" r="2"/><circle cx="15" cy="7" r="1.6"/><circle cx="16" cy="14" r="2.2"/><circle cx="9" cy="16" r="1.6"/>',
  heat: '<path d="M10 4a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>',
  luck: '<circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><circle cx="9" cy="15" r="3"/><circle cx="15" cy="15" r="3"/>',
  frozen: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/>',
  thorns: '<path d="M4 20C9 15 15 9 20 4"/><path d="M8 16l-3.5-1M10.5 13.5l.5-4M14 10l4 .5M16.5 7.5l-.5-3.5"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  heal: '<path d="M12 5v14M5 12h14"/>',
  ls: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9.5 13.5l2.5 3 2.5-3"/>',
};
const STATUS_VAR = { burn: '--s-fire', poison: '--s-venom', frost: '--s-frost', slow: '--s-frost', sand: '--s-desert', heat: '--s-fire', luck: '--s-fortune', frozen: '--s-frost', thorns: '--s-thorn', shield: '--s-shield', heal: '--s-heal', ls: '--s-blood' };
// Keyword symbols: inline in item text, and as small badges on item icons.
const KW_RE = /\b(Burn|Poison|Frost|Freezes?|Frozen|Slow|Sand|Heat|Luck|Thorns|Shield|Lifesteal|[Hh]eals?|[Hh]ealing)\b/g;
const kwKey = w => { const l = w.toLowerCase(); return l.startsWith('free') || l === 'frozen' ? 'frozen' : l.startsWith('heal') ? 'heal' : l === 'lifesteal' ? 'ls' : l; };
const kwIcon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICON[k]}</svg>`;
const kwText = text => text.replace(KW_RE, w => { const k = kwKey(w); return `<span class="kw" style="--sc: var(${STATUS_VAR[k]})">${kwIcon(k)}${w}</span>`; });
function itemKws(def) {
  if (!def._kws) {
    const seen = [];
    for (const m of (def.text ?? '').matchAll(KW_RE)) { const k = kwKey(m[1]); if (!seen.includes(k)) seen.push(k); }
    def._kws = seen.slice(0, 2);
  }
  return def._kws;
}
const kwBadges = def => (isUse(def.id) ? '' : `<span class="kw-badges">${itemKws(def).map(k => `<i style="--sc: var(${STATUS_VAR[k]})">${kwIcon(k)}</i>`).join('')}</span>`);
const STATUS_NAME = { burn: 'Burn', poison: 'Poison', frost: 'Frost', slow: 'Slow', sand: 'Sand', heat: 'Heat', luck: 'Luck', ls: 'Lifesteal', thorns: 'Thorns' };

/* =========================================================
   State
   ========================================================= */
let uidN = 1;
const inst = id => ({ uid: uidN++, id });
// Pixel mode has a light and a dark theme; dark is the default.
function loadDark() {
  try { return localStorage.getItem('pixelDark') !== '0'; } catch { return true; }
}
// Dark Pixel is the default look until the player picks something else.
function loadStyle() { try { return localStorage.getItem('artStyle') === 'smooth' ? 'smooth' : 'pixel'; } catch { return 'pixel'; } }
const MP = materialFactory('pixel');
const matFor = style => (style === 'pixel' ? MP : MS);
const emptyEquip = () => Object.fromEntries(ALL_SLOTS.map(k => [k, null]));
const S = {
  day: 1, gold: 10, lives: 5, maxLives: 5, wins: 0, goal: 10,
  equip: emptyEquip(), bag: Array(6).fill(null), shop: [], sel: null, ttStyle: loadStyle(), pixelDark: loadDark(), record: [], started: false,
  ench: [], use: Array(6).fill(null), shards: 0,
};

/* ---------- Profile: appearance and backdrop, saved in this browser ---------- */
const LOOKS = {
  skin: [0xf3c7a0, 0xe8b48a, 0xc98e62, 0xa4704a, 0x7a4e32, 0x55372a],
  hair: [0x7a4524, 0x2a1d18, 0xd9a441, 0xb5442a, 0xe8e2d6, 0x4a6ad8, 0xd85a9a, 0x3f8a5a],
  eyes: [0x2a1d18, 0x2f6ad0, 0x2f8a4a, 0x8a4ad0, 0xc0392b, 0xd99a2a],
  tunic: [0x5f7fa8, 0xa83f3f, 0x4f8a4f, 0x7a5aa8, 0xc48a24, 0x3a3f4a, 0xd8d0c0, 0x2f8a8a],
};
const LOOK_NAME = { skin: 'Skin', hair: 'Hair colour', eyes: 'Eyes', tunic: 'Outfit' };
const HAIR_STYLES = [['spiky', 'Spiky'], ['bob', 'Bob'], ['long', 'Long'], ['pony', 'Ponytail'], ['bun', 'Bun'], ['curly', 'Curly'], ['bald', 'None']];
const BACKDROPS = [['hearth', 'Hearth'], ['forge', 'Ember Forge'], ['peaks', 'Frost Peaks'], ['dunes', 'Dune Sunset'], ['chapel', 'Dawn Chapel'], ['night', 'Starry Night'], ['meadow', 'Meadow'], ['mire', 'Mire'], ['roses', 'Rose Garden']];
const DEFAULT_PROFILE = { name: 'Wanderer', skin: LOOKS.skin[0], hair: LOOKS.hair[0], eyes: LOOKS.eyes[0], tunic: LOOKS.tunic[0], hairStyle: 'spiky', backdrop: 'hearth' };
function loadProfile() {
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem('profile') || '{}') }; } catch { return { ...DEFAULT_PROFILE }; }
}
const P = loadProfile();
const saveProfile = () => { try { localStorage.setItem('profile', JSON.stringify(P)); } catch { /* storage unavailable */ } };
const lookOf = p => ({ skin: p.skin, hair: p.hair, eyes: p.eyes, tunic: p.tunic, hairStyle: p.hairStyle });
const playerName = () => P.name.trim() || 'You';
function setBackdrop(el, id) {
  for (const [b] of BACKDROPS) el.classList.remove(`bd-${b}`);
  el.classList.add('bd', `bd-${id}`);
}

const getItem = loc => {
  if (!loc) return null;
  const [w, k] = loc.split(':');
  if (w === 'shop') { const o = S.shop[+k]; return o && !o.sold ? o : null; }
  if (w === 'bag') return S.bag[+k];
  if (w === 'ench') { const o = S.ench[+k]; return o && !o.sold ? o : null; }
  if (w === 'use') return S.use[+k];
  return S.equip[k];
};
// Half price, plus 1 gold per successful scroll. Consumables sell one at a time.
const sellValue = item => Math.floor(ALL[item.id].price / 2) + (isUse(item.id) ? 0 : sellBonus(item));
const freeBag = (except = -1) => S.bag.map((v, i) => (v === null && i !== except ? i : -1)).filter(i => i >= 0);
const isTwoHanded = item => !!(item && ITEMS[item.id].weapon?.hands === 2);

function refreshShop() {
  const old = S.shop;
  const locked = new Set((old || []).filter(o => o && o.locked && !o.sold).map(o => o.id));
  const ids = rollShopOffers(S.day, rng, d => locked.has(d.id));
  S.shop = ids.map((id, i) => (old[i] && old[i].locked && !old[i].sold ? old[i] : { ...inst(id), locked: false, sold: false }));
  rollEnch();
}
// The Enchanter shelf: 3 consumables. Every 3rd day the Lucky Merchant puts a rare one in the last spot at 1 gold off.
const LUCKY_IDS = ['chaos_scroll', 'mirror_cube', 'golden_hammer'];
const luckyDay = day => day % 3 === 0;
function rollEnch() {
  S.ench = Array.from({ length: 3 }, () => ({ ...inst(rollUseId(S.day, rng)), sold: false }));
  if (luckyDay(S.day)) S.ench[2] = { ...inst(LUCKY_IDS[Math.floor(rng() * LUCKY_IDS.length)]), sold: false, lucky: true };
}
const enchPrice = o => USE[o.id].price - (o.lucky ? 1 : 0);

/* =========================================================
   Market actions
   ========================================================= */
let freshUid = null;
function pay(n) {
  if (S.gold < n) { toast(`You need ${n} gold and have ${S.gold}.`); return false; }
  S.gold -= n;
  bumpGold();
  return true;
}
function placeEquip(item, slot, srcBag) {
  const displaced = [];
  if (S.equip[slot]) displaced.push(S.equip[slot]);
  if (slot === 'weapon' && isTwoHanded(item) && S.equip.offhand) displaced.push(S.equip.offhand);
  if (slot === 'offhand' && isTwoHanded(S.equip.weapon)) displaced.push(S.equip.weapon);
  const free = freeBag(srcBag ?? -1);
  const room = free.length + (srcBag != null ? 1 : 0);
  if (displaced.length > room) { toast('Your bag is full. Sell something first.'); return false; }
  if (srcBag != null) S.bag[srcBag] = null;
  if (slot === 'weapon' && isTwoHanded(item)) S.equip.offhand = null;
  if (slot === 'offhand' && isTwoHanded(S.equip.weapon)) S.equip.weapon = null;
  S.equip[slot] = item;
  displaced.forEach((d, i) => {
    if (i === 0 && srcBag != null) S.bag[srcBag] = d;
    else S.bag[free.shift()] = d;
  });
  return true;
}
function defaultSlot(id) {
  const s = ITEMS[id].slot;
  if (s !== 'ring') return s;
  return !S.equip.ring1 ? 'ring1' : !S.equip.ring2 ? 'ring2' : 'ring1';
}
function buy(i, dest) {
  const o = S.shop[i];
  if (!o || o.sold) return;
  const def = ITEMS[o.id];
  let target = dest;
  if (!target) {
    const b = freeBag();
    if (!b.length) return toast(S.gold < def.price ? `You need ${def.price} gold and have ${S.gold}.` : 'Your bag is full. Sell or equip something first.');
    target = { where: 'bag', key: b[0] };
  }
  if (target.where === 'bag' && S.bag[target.key]) return toast('That bag slot is taken.');
  if (target.where === 'equip' && !fitsSlot(o.id, target.key)) return toast(`${def.name} goes in the ${slotLabel(def).toLowerCase()} slot.`);
  if (S.gold < def.price) return toast(`You need ${def.price} gold and have ${S.gold}.`);
  const item = { uid: o.uid, id: o.id };
  if (target.where === 'equip') { if (!placeEquip(item, target.key, null)) return; }
  else S.bag[target.key] = item;
  pay(def.price);
  o.sold = true;
  S.sel = `${target.where}:${target.key}`;
  freshUid = item.uid;
  toast(`Bought ${def.name} for ${def.price} gold.`);
  commit();
}
function equipFrom(loc, slot) {
  const item = getItem(loc);
  if (!item) return;
  const def = ITEMS[item.id];
  slot = slot || defaultSlot(item.id);
  if (!fitsSlot(item.id, slot)) return toast(`${def.name} goes in the ${slotLabel(def).toLowerCase()} slot.`);
  const [w, k] = loc.split(':');
  if (w === 'equip') {
    if (k === slot) return;
    const otherItem = S.equip[slot];
    S.equip[slot] = item;
    S.equip[k] = otherItem;
  } else if (w === 'bag') {
    if (!placeEquip(item, slot, +k)) return;
  }
  S.sel = `equip:${slot}`;
  freshUid = item.uid;
  commit();
}
function unequip(slot, bagIndex) {
  const item = S.equip[slot];
  if (!item) return;
  let target = bagIndex;
  if (target == null) {
    const free = freeBag();
    if (!free.length) return toast('Your bag is full. Sell something first.');
    target = free[0];
  }
  const occupant = S.bag[target];
  if (occupant) {
    if (!fitsSlot(occupant.id, slot)) return toast('That bag slot is taken.');
    S.equip[slot] = null;
    if (!placeEquip(occupant, slot, null)) { S.equip[slot] = item; return; }
    freshUid = occupant.uid;
  } else {
    S.equip[slot] = null;
  }
  S.bag[target] = item;
  S.sel = `bag:${target}`;
  commit();
}
function sell(loc) {
  const item = getItem(loc);
  if (!item) return;
  const [w, k] = loc.split(':');
  if (w === 'shop' || w === 'ench') return;
  const v = sellValue(item);
  if (w === 'use') { if (--item.n <= 0) S.use[+k] = null; }
  else if (w === 'bag') S.bag[+k] = null;
  else S.equip[k] = null;
  S.gold += v;
  bumpGold();
  if (S.sel === loc && !getItem(loc)) S.sel = null;
  toast(`Sold ${ALL[item.id].name} for ${v} gold.`);
  commit();
}
function swapBag(a, b) {
  if (a === b) return;
  [S.bag[a], S.bag[b]] = [S.bag[b], S.bag[a]];
  S.sel = `bag:${b}`;
  commit();
}
function reroll() {
  if (!pay(1)) return;
  refreshShop();
  if (S.sel?.startsWith('shop:') || S.sel?.startsWith('ench:')) S.sel = null;
  toast('New offers in the market.');
  commit();
}
function toggleLock(i) {
  const o = S.shop[i];
  o.locked = !o.locked;
  commit();
}
function quick(loc) {
  const [w, k] = loc.split(':');
  if (w === 'shop' || w === 'ench') return;
  if (w === 'use') return startTargeting(+k);
  if (w === 'bag') equipFrom(loc);
  else unequip(k);
}
function canDrop(from, target) {
  const item = getItem(from);
  if (!item) return false;
  const [fw, fk] = from.split(':');
  const [tw, tk] = target.split(':');
  if (fw === 'use' || fw === 'ench') {
    if (tw === 'sell') return fw === 'use';
    if (tw === 'use') return fw === 'use' ? fk !== tk : useFits(item.id, +tk);
    const gear = getItem(target);
    return !!gear && !useCheck(item.id, gear);
  }
  if (tw === 'use') return false;
  if (tw === 'sell') return fw !== 'shop';
  if (tw === 'equip') return fitsSlot(item.id, tk) && !(fw === 'equip' && fk === tk);
  if (tw === 'bag') {
    if (fw === 'shop') return !S.bag[+tk];
    if (fw === 'bag') return fk !== tk;
    const occ = S.bag[+tk];
    return !occ || fitsSlot(occ.id, fk);
  }
  return false;
}
function drop(from, target) {
  const [fw, fk] = from.split(':');
  const [tw, tk] = target.split(':');
  if (fw === 'use') {
    if (tw === 'sell') return sell(from);
    if (tw === 'use') return moveUse(+fk, +tk);
    return openEnchant(+fk, target);
  }
  if (fw === 'ench') {
    if (tw === 'use') return buyUse(+fk, +tk);
    const u = buyUse(+fk);
    if (u >= 0) openEnchant(u, target);
    return;
  }
  if (tw === 'sell') return sell(from);
  if (fw === 'shop') return buy(+fk, { where: tw, key: tw === 'bag' ? +tk : tk });
  if (tw === 'equip') return equipFrom(from, tk);
  if (tw === 'bag') return fw === 'bag' ? swapBag(+fk, +tk) : unequip(fk, +tk);
}

/* =========================================================
   Consumables: the Use row, scrolls, cubes and the forge
   ========================================================= */
const STACK = 9;
const useFits = (id, i) => !S.use[i] || (S.use[i].id === id && S.use[i].n < STACK);
function useRoom(id, prefer) {
  if (prefer != null) return useFits(id, prefer) ? prefer : -1;
  const same = S.use.findIndex(s => s && s.id === id && s.n < STACK);
  return same >= 0 ? same : S.use.indexOf(null);
}
function buyUse(i, dest) {
  const o = S.ench[i];
  if (!o || o.sold) return -1;
  const def = USE[o.id];
  const price = enchPrice(o);
  const slot = useRoom(o.id, dest);
  if (slot < 0) { toast(dest != null ? 'That Use slot holds something else.' : 'Your Use row is full. Use or sell a consumable first.'); return -1; }
  if (!pay(price)) return -1;
  if (S.use[slot]) S.use[slot].n++;
  else S.use[slot] = { uid: o.uid, id: o.id, n: 1 };
  o.sold = true;
  freshUid = S.use[slot].uid;
  S.sel = `use:${slot}`;
  toast(`Bought ${def.name} for ${price} gold.`);
  commit();
  return slot;
}
function moveUse(a, b) {
  const x = S.use[a], y = S.use[b];
  if (y && y.id === x.id) {
    const n = Math.min(STACK - y.n, x.n);
    y.n += n;
    x.n -= n;
    if (!x.n) S.use[a] = null;
  } else {
    [S.use[a], S.use[b]] = [y, x];
  }
  S.sel = `use:${b}`;
  commit();
}
// Why a consumable can't go on this item, or null when it can.
function useCheck(useId, item) {
  const d = USE[useId];
  if (!item || isUse(item.id)) return 'Consumables go on gear: an equipped item or one in your bag.';
  const name = ITEMS[item.id].name;
  if (d.kind === 'lock') return 'Lockstones are spent in the cube window: tick a line to keep it.';
  if ((d.kind === 'scroll' || d.kind === 'chaos') && slotsLeft(item) <= 0) return `${name} has no upgrade slots left.`;
  if (d.kind === 'hammer' && item.up?.extra) return `${name} has already been hammered.`;
  return null;
}
const useCount = id => S.use.reduce((n, s) => n + (s && s.id === id ? s.n : 0), 0);
function spendUse(i) {
  const s = S.use[i];
  if (--s.n <= 0) S.use[i] = null;
}
function spendById(id) {
  const i = S.use.findIndex(s => s && s.id === id);
  if (i >= 0) spendUse(i);
}

/* ---------- Targeting: pick an item after "Use on an item" ---------- */
let targeting = null;
function markTargets() {
  for (const cell of document.querySelectorAll('.slot[data-drop]')) {
    const loc = cell.dataset.drop;
    const gear = targeting != null && /^(equip|bag):/.test(loc) ? getItem(loc) : null;
    cell.classList.toggle('can-use', !!gear && !useCheck(S.use[targeting].id, gear));
  }
}
function startTargeting(i) {
  const s = S.use[i];
  if (!s) return;
  if (USE[s.id].kind === 'lock') return toast(useCheck(s.id, {}));
  targeting = i;
  closeSheet();
  document.body.classList.add('targeting');
  markTargets();
  if (!document.querySelector('.can-use')) { stopTargeting(); return toast(`Nothing here can take a ${USE[s.id].name} right now.`); }
  toast(`Choose an item for the ${USE[s.id].name}. Esc cancels.`);
}
function stopTargeting() {
  targeting = null;
  document.body.classList.remove('targeting');
  markTargets();
}

/* ---------- The enchant window ---------- */
const enchantEl = $('enchant');
let E = null;
const signed = n => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;
// Mirrors the caps in itemMods so the numbers shown never promise more than combat gives.
const CAPS = [['dmgPct', 'atk', 6, 30, 'weapon damage +30%'], ['spdPct', 'spd', 3, 25, 'attack time −25%'], ['cdPct', 'cd', 4, 25, 'cooldown −25%']];
function stepsHTML(item) {
  const st = item.up?.st ?? {};
  const ks = Object.keys(st).filter(k => st[k]);
  const capped = CAPS.filter(([line, k, per, cap]) => (st[k] ?? 0) * per + (item.pot?.lines ?? []).filter(l => l.k === line).reduce((n, l) => n + l.v, 0) > cap);
  return (ks.length ? ks.map(k => `<span class="up-chip">${STATS[k].name} ${signed(st[k])} · ${STATS[k].text(st[k]).replace(' weapon damage', ' damage')}</span>`).join('') : '')
    + (capped.length ? `<span class="up-cap">Capped at ${capped.map(c => c[4]).join(', ')}</span>` : '');
}
function potHTML(pot, lockable = false) {
  if (!pot) return '<p class="pot-none">No potential yet. The first cube gives it Rare potential.</p>';
  return `<div class="pot t${pot.tier}"><span class="pot-tier">${TIERS[pot.tier]} potential</span>${pot.lines.map((l, i) => (lockable
    ? `<label class="pot-line"><input type="checkbox" data-lockline="${i}"${E.lock === i ? ' checked' : ''}><span>${lineText(l)}</span></label>`
    : `<span class="pot-line">${lineText(l)}</span>`)).join('')}</div>`;
}
// Upgrade summary for the inspector and tooltips.
function upgradeHTML(item, compact = false) {
  if (!item || isUse(item.id) || !ITEMS[item.id]) return '';
  const used = item.up?.used ?? 0;
  const slots = `<span class="up-slots">Upgrade slots ${slotsLeft(item)} / ${slotsTotal(item)} left${item.up?.extra ? ' · hammered' : ''}</span>`;
  if (compact && !used && !item.pot && !item.up?.extra) return '';
  return `<div class="up-box">${slots}${stepsHTML(item)}${item.pot ? potHTML(item.pot) : compact ? '' : '<span class="pot-none">No potential</span>'}</div>`;
}
function openEnchant(useIdx, loc) {
  const stack = S.use[useIdx];
  const item = getItem(loc);
  if (!stack || !item) return;
  const why = useCheck(stack.id, item);
  if (why) return toast(why);
  hideTip();
  closeSheet();
  const stats = FAMILY_STATS[family(ITEMS[item.id])];
  E = { kind: 'use', useIdx, useId: stack.id, item, phase: 'confirm', stat: stats[0], lock: -1, res: null, roll: null };
  renderEnchant();
}
function openForge() {
  if (S.shards < 3) return;
  const pool = ITEM_IDS.filter(id => ITEMS[id].rarity === 'legendary');
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  E = { kind: 'forge', picks };
  hideTip();
  renderEnchant();
}
function closeEnchant() {
  if (!E || E.phase === 'choose') return;
  E = null;
  enchantEl.hidden = true;
  commit();
}
function removeGear(item) {
  for (const k of ALL_SLOTS) if (S.equip[k] === item) S.equip[k] = null;
  S.bag = S.bag.map(b => (b === item ? null : b));
  if (S.sel && !getItem(S.sel)) S.sel = null;
}
const sparks = n => Array.from({ length: n }, (_, i) => `<i style="--a:${(i * 360) / n + Math.random() * 20}deg;--d:${50 + Math.random() * 40}px"></i>`).join('');
function enchantHead(def, item) {
  return `<div class="en-head">
    <span class="en-ico"><img src="${iconFor(def.id)}" alt=""></span>
    <svg class="en-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6"/></svg>
    <span class="en-ico item r-${ITEMS[item.id].rarity} en-target"><img src="${iconFor(item.id)}" alt="">${badges(item)}</span>
    <div class="en-title"><span class="en-name r-${def.rarity}" id="en-title">${def.name}</span><span class="en-sub">on ${ITEMS[item.id].name}</span></div>
  </div>`;
}
function renderEnchant() {
  if (!E) { enchantEl.hidden = true; return; }
  const btn = (act, label, primary) => `<button type="button" class="btn${primary ? ' primary' : ''}" data-en="${act}">${label}</button>`;
  let body = '', foot = '';
  if (E.kind === 'forge') {
    body = `<div class="en-title"><span class="en-name r-legendary" id="en-title">The Forge</span><span class="en-sub">3 Shards make a legendary. Choose one.</span></div>
      <div class="forge">${E.picks.map(id => `<button type="button" class="forge-pick" data-pick="${id}"><span class="en-ico item r-legendary"><img src="${iconFor(id)}" alt=""></span><b class="r-legendary">${ITEMS[id].name}</b><span>${slotLabel(ITEMS[id])}</span><span class="fp-text">${kwText(ITEMS[id].text)}</span></button>`).join('')}</div>`;
    foot = btn('close', 'Later', false);
  } else {
    const def = USE[E.useId];
    const item = E.item;
    const fam = family(ITEMS[item.id]);
    const left = S.use[E.useIdx]?.id === E.useId ? S.use[E.useIdx].n : 0;
    body = enchantHead(def, item);
    if (E.phase === 'confirm') {
      if (def.kind === 'scroll' || def.kind === 'chaos') {
        const p = scrollChance(item, def);
        const fails = item.up?.fails ?? 0;
        const st = item.up?.st ?? {};
        if (def.kind === 'scroll') {
          body += `<div class="en-label">Choose a stat</div><div class="en-stats">${FAMILY_STATS[fam].map(k => {
            const cur = st[k] ?? 0;
            return `<button type="button" class="en-stat${E.stat === k ? ' on' : ''}" data-stat="${k}" aria-pressed="${E.stat === k}"><b>${STATS[k].name}</b><span>${cur ? STATS[k].text(cur) : 'None yet'}</span><span class="to">→ ${STATS[k].text(cur + def.gain)}</span></button>`;
          }).join('')}</div>`;
        } else {
          body += `<div class="en-label">Both stats change by −2 to +4 steps</div><div class="en-stats">${FAMILY_STATS[fam].map(k => `<div class="en-stat"><b>${STATS[k].name}</b><span>${st[k] ? STATS[k].text(st[k]) : 'None yet'}</span><span class="to">${STATS[k].per}</span></div>`).join('')}</div>`;
        }
        body += `<div class="en-odds"><span class="big">${Math.round(p * 100)}%</span><span>success${fails ? `, including +${fails * 5}% from ${fails} failed attempt${fails > 1 ? 's' : ''}` : ''}</span></div>
          <p class="en-note">Upgrade slots: ${slotsLeft(item)} of ${slotsTotal(item)} left. This uses one whether it works or not.</p>
          ${def.destroy ? `<p class="en-warn">On failure, a ${Math.round(def.destroy * 100)}% chance ${ITEMS[item.id].name} is destroyed. It leaves a Shard.</p>` : ''}`;
        foot = btn('go', 'Read scroll', true) + btn('close', 'Cancel', false);
      } else if (def.kind === 'hammer') {
        body += `<p class="en-note">Adds one upgrade slot: ${slotsLeft(item)} / ${slotsTotal(item)} → ${slotsLeft(item) + 1} / ${slotsTotal(item) + 1}. Each item can be hammered once.</p>`;
        foot = btn('go', 'Strike', true) + btn('close', 'Cancel', false);
      } else {
        const locks = useCount('lockstone');
        const lockable = !!item.pot && locks > 0;
        body += `<div class="en-label">Current potential</div>${potHTML(item.pot, lockable)}
          <p class="en-note">${def.text}${lockable ? ` Tick a line to keep it (uses 1 of your ${locks} Lockstone${locks > 1 ? 's' : ''}).` : item.pot ? ' Buy a Lockstone to keep a line through a reroll.' : ''}</p>`;
        foot = btn('go', 'Roll cube', true) + btn('close', 'Cancel', false);
      }
    } else if (E.phase === 'choose') {
      body += `<div class="en-label">${E.roll.tierUp ? `<b class="tierup">Tier up: ${TIERS[E.roll.pot.tier]}!</b> ` : ''}Keep either set</div>
        <div class="en-pair"><div><span class="en-label">Before</span>${potHTML(E.roll.old)}</div><div class="new"><span class="en-label">New</span>${potHTML(E.roll.pot)}</div></div>`;
      foot = btn('old', 'Keep before', false) + btn('new', 'Keep new', true);
    } else {
      const r = E.res;
      const word = { success: 'Success!', fail: 'Failed', destroy: 'Destroyed', hammer: 'Slot added', cube: E.roll?.tierUp ? `Tier up: ${TIERS[E.item.pot.tier]}!` : 'Rerolled', kept: 'Done' }[r];
      const detail = r === 'success' ? E.changes.map(c => `${STATS[c.k].name} ${signed(c.d)}`).join(' · ')
        : r === 'fail' ? `The scroll fizzled. The next attempt on this item gets +5%.`
        : r === 'destroy' ? `${ITEMS[item.id].name} crumbled into a Shard (${S.shards} / 3).`
        : r === 'hammer' ? `Upgrade slots: ${slotsLeft(item)} / ${slotsTotal(item)} left.` : '';
      body += `<div class="en-result ${r}"><span class="en-burst" aria-hidden="true">${r === 'fail' ? '' : sparks(r === 'destroy' ? 10 : 16)}</span><span class="en-word">${word}</span>${detail ? `<span class="en-detail">${detail}</span>` : ''}</div>`;
      if (r === 'cube' || r === 'kept') body += potHTML(item.pot);
      else if (r !== 'destroy') body += `<div class="en-after">${stepsHTML(item)}</div>`;
      const again = r !== 'destroy' && left > 0 && !useCheck(E.useId, item);
      foot = (again ? btn('again', `Again · ${left} left`, false) : '') + (r === 'destroy' && S.shards >= 3 ? btn('forge', 'Forge a legendary', true) : '') + btn('close', 'Done', !(r === 'destroy' && S.shards >= 3));
    }
  }
  enchantEl.innerHTML = `<div class="result-card en-card" role="dialog" aria-modal="true" aria-labelledby="en-title">${body}<div class="en-foot">${foot}</div></div>`;
  enchantEl.hidden = false;
  enchantEl.querySelector('.btn.primary, .btn')?.focus({ preventScroll: true });
}
function enchantAct(act) {
  if (act === 'close') return closeEnchant();
  if (act === 'forge') return openForge();
  if (act === 'again') { E.phase = 'confirm'; E.lock = -1; return renderEnchant(); }
  const item = E.item;
  if (act === 'old' || act === 'new') {
    item.pot = act === 'new' ? E.roll.pot : E.roll.old;
    E.res = 'kept';
    E.phase = 'result';
    commit();
    return renderEnchant();
  }
  if (act !== 'go' || S.use[E.useIdx]?.id !== E.useId) return;
  const def = USE[E.useId];
  spendUse(E.useIdx);
  if (def.kind === 'scroll' || def.kind === 'chaos') {
    const r = applyScroll(item, def, E.stat, rng);
    E.res = r.result;
    E.changes = r.changes;
    if (r.result === 'destroy') { removeGear(item); S.shards++; }
  } else if (def.kind === 'hammer') {
    applyHammer(item);
    E.res = 'hammer';
  } else {
    if (E.lock >= 0) spendById('lockstone');
    E.roll = rollCube(item, def, rng, E.lock);
    E.lock = -1;
    if (def.choose) { E.phase = 'choose'; commit(); return renderEnchant(); }
    item.pot = E.roll.pot;
    E.res = 'cube';
  }
  E.phase = 'result';
  commit();
  renderEnchant();
}
enchantEl.addEventListener('click', e => {
  const b = e.target.closest('[data-en]');
  if (b) return enchantAct(b.dataset.en);
  const st = e.target.closest('[data-stat]');
  if (st && E?.phase === 'confirm') { E.stat = st.dataset.stat; return renderEnchant(); }
  const pick = e.target.closest('[data-pick]');
  if (pick && E?.kind === 'forge') {
    const free = freeBag();
    if (!free.length) return toast('Free a bag slot for the legendary first.');
    const item = inst(pick.dataset.pick);
    S.bag[free[0]] = item;
    S.shards -= 3;
    freshUid = item.uid;
    S.sel = `bag:${free[0]}`;
    toast(`Forged ${ITEMS[item.id].name}.`);
    E = null;
    enchantEl.hidden = true;
    commit();
    return;
  }
  if (e.target === enchantEl) closeEnchant();
});
enchantEl.addEventListener('change', e => {
  const c = e.target.closest('[data-lockline]');
  if (!c) return;
  E.lock = c.checked ? +c.dataset.lockline : -1;
  renderEnchant();
});

/* =========================================================
   Market DOM
   ========================================================= */
const equipCells = {};
for (const [colId, keys] of [['col-left', LEFT], ['col-right', RIGHT]]) {
  const col = $(colId);
  for (const k of keys) {
    const cell = document.createElement('div');
    cell.className = 'slot';
    cell.dataset.drop = `equip:${k}`;
    col.append(cell);
    equipCells[k] = cell;
  }
}
const bagCells = [];
for (let i = 0; i < 6; i++) {
  const cell = document.createElement('div');
  cell.className = 'slot';
  cell.dataset.drop = `bag:${i}`;
  $('bag-cells').append(cell);
  bagCells.push(cell);
}
const useCells = [];
for (let i = 0; i < 6; i++) {
  const cell = document.createElement('div');
  cell.className = 'slot';
  cell.dataset.drop = `use:${i}`;
  $('use-cells').append(cell);
  useCells.push(cell);
}
const offerEls = [];
for (let i = 0; i < 5; i++) {
  const el = document.createElement('div');
  el.className = 'offer';
  $('offers').append(el);
  offerEls.push(el);
}
const enchEls = [];
for (let i = 0; i < 3; i++) {
  const el = document.createElement('div');
  el.className = 'eoffer';
  $('ench').append(el);
  enchEls.push(el);
}
const glyph = k => `<svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${GLYPH[k]}</svg>`;
const schoolDot = sc => `<span class="dot" style="--sc: var(${SCHOOL_VAR[sc]})"></span>`;
// Corner badges: +N scroll steps and a potential-tier gem on gear, stack size on consumables.
function badges(item) {
  if (isUse(item.id)) return item.n > 1 ? `<span class="b-n">${item.n}</span>` : '';
  const st = steps(item);
  return (st ? `<span class="b-up${st < 0 ? ' neg' : ''}">${signed(st)}</span>` : '')
    + (item.pot ? `<span class="b-pot t${item.pot.tier}"></span>` : '');
}
function itemBtn(item, loc, extraLabel = '') {
  const def = ALL[item.id];
  const cls = ['item', `r-${def.rarity}`];
  if (S.sel === loc) cls.push('sel');
  if (item.uid === freshUid) cls.push('pop');
  return `<button type="button" class="${cls.join(' ')}" data-loc="${loc}" aria-label="${def.name}${extraLabel}"><img src="${iconFor(item.id)}" alt="" draggable="false">${kwBadges(def)}${badges(item)}</button>`;
}
function renderTop() {
  $('day').textContent = `Day ${S.day}`;
  $('gold').textContent = S.gold;
  $('lives').innerHTML = Array.from({ length: S.maxLives }, (_, i) => HEART(i < S.lives)).join('');
  $('lives').setAttribute('aria-label', `${S.lives} of ${S.maxLives} lives`);
  $('wins-num').textContent = `${S.wins} / ${S.goal}`;
  $('wins').innerHTML = Array.from({ length: S.goal }, (_, i) => `<i class="${i < S.wins ? 'on' : ''}"></i>`).join('');
  $('fight-sub').textContent = `vs. a Day ${S.day} ghost`;
}
function renderEquip() {
  for (const k of ALL_SLOTS) {
    const it = S.equip[k];
    equipCells[k].innerHTML = it ? itemBtn(it, `equip:${k}`, `, equipped as ${SLOT_NAME[k]}`) : glyph(k);
    equipCells[k].title = it ? '' : SLOT_NAME[k];
  }
}
function renderBag() {
  bagCells.forEach((cell, i) => { cell.innerHTML = S.bag[i] ? itemBtn(S.bag[i], `bag:${i}`, ', in bag') : ''; });
  useCells.forEach((cell, i) => { const u = S.use[i]; cell.innerHTML = u ? itemBtn(u, `use:${i}`, `, ${u.n} in Use row`) : ''; });
  $('bag-count').textContent = `${S.bag.filter(Boolean).length} / 6`;
  $('shards').innerHTML = `<span class="shard-gem" aria-hidden="true"></span>Shards ${S.shards} / 3${S.shards >= 3 ? ' <button type="button" class="btn primary mini" id="forge">Forge</button>' : ''}`;
}
function renderShop() {
  S.shop.forEach((o, i) => {
    const el = offerEls[i];
    const def = ITEMS[o.id];
    el.classList.toggle('locked', o.locked);
    el.classList.toggle('sold', o.sold);
    const lockBtn = `<button type="button" class="lock" data-lock="${i}" aria-pressed="${o.locked}" aria-label="${o.locked ? 'Unlock' : 'Lock'} ${def.name}" title="${o.locked ? 'Locked: kept on reroll' : 'Lock to keep on reroll'}">${o.locked ? LOCK : UNLOCK}</button>`;
    if (o.sold) {
      el.innerHTML = `${lockBtn}<div class="slot"></div><div class="sold-tag">Sold</div><div class="o-meta">Reroll for new offers</div>`;
      return;
    }
    el.innerHTML = `${lockBtn}
      <div class="slot">${itemBtn(o, `shop:${i}`, `, ${def.price} gold`)}</div>
      <div class="o-name r-${def.rarity}">${def.name}</div>
      <div class="o-meta">${def.schools.map(sc => `${schoolDot(sc)}${sc}`).join(' ')}</div>
      <div class="price${S.gold < def.price ? ' short' : ''}">${COIN}${def.price}</div>`;
  });
  S.ench.forEach((o, i) => {
    const el = enchEls[i];
    const def = USE[o.id];
    const price = enchPrice(o);
    el.classList.toggle('sold', o.sold);
    el.classList.toggle('lucky', !!o.lucky);
    el.innerHTML = o.sold
      ? '<div class="slot"></div><div class="e-txt"><span class="e-name sold-tag">Sold</span></div>'
      : `<div class="slot">${itemBtn(o, `ench:${i}`, `, ${price} gold`)}</div>
        <div class="e-txt"><span class="e-name r-${def.rarity}">${def.name}</span><span class="price${S.gold < price ? ' short' : ''}">${COIN}${price}${o.lucky ? `<s>${def.price}</s>` : ''}</span></div>
        ${o.lucky ? '<span class="lucky-tag">Lucky</span>' : ''}`;
  });
  const until = 3 - (S.day % 3);
  $('ench-note').textContent = luckyDay(S.day) ? 'The Lucky Merchant is in town' : `Lucky Merchant in ${until} day${until > 1 ? 's' : ''}`;
}
/* ---------- Stats: the four tiles, and the full stat sheet they open ---------- */
const STAT_ICON = {
  hp: '<path d="M12 20.5s-7.2-4.5-9.4-9.3C1.1 7.9 3.3 4.5 6.8 4.5c2 0 3.4 1.1 4.2 2.4.8-1.3 2.2-2.4 4.2-2.4 3.5 0 5.7 3.4 4.2 6.7-2.2 4.8-9.4 9.3-9.4 9.3z"/>',
  dmg: '<path d="M20 4l-1 4-9 9-3-3 9-9z"/><path d="M6 13l5 5M4 20l3-3"/>',
  spd: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M10 3h4"/>',
  crit: '<path d="M12 2l2.2 6.2L20.5 6l-2.9 5.9L22 15l-6.3.4L15 22l-3-5.6L9 22l-.7-6.6L2 15l4.4-3.1L3.5 6l6.3 2.2z"/>',
  luck: STATUS_ICON.luck, ls: STATUS_ICON.ls, cd: '<path d="M12 4a8 8 0 1 0 8 8"/><path d="M12 8v4l3 2M17 3v4h4"/>',
};
const STAT_VAR = { hp: '--danger', dmg: '--gold', spd: '--s-frost', crit: '--s-fortune', luck: '--s-fortune', ls: '--s-blood', cd: '--s-holy' };
const statIcon = k => `<svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(${STAT_VAR[k]})">${STAT_ICON[k]}</svg>`;
let sheetOpen = false;
// Everything the stat sheet shows, from the equipped items and their upgrades.
function buildStats() {
  let hp = 100, luck = 0, ls = 0;
  const hpParts = [];
  for (const k of ALL_SLOTS) {
    const it = S.equip[k];
    if (!it) continue;
    const m = itemMods(it);
    const add = (ITEMS[it.id].hp || 0) + m.hp;
    if (add) hpParts.push(`${ITEMS[it.id].name} +${add}`);
    hp += add;
    luck += (ITEMS[it.id].stats?.luck || 0) + m.luck;
    ls += m.ls;
  }
  const weapon = (it, w) => {
    const m = it ? itemMods(it) : itemMods({});
    return { name: it ? ITEMS[it.id].name : 'Fists', dmg: w.dmg * (1 + m.dmgPct / 100), interval: w.interval * (1 - m.spdPct / 100), critMult: Math.max(2, w.critMult || 2), ls: (w.ls || 0) * 100 };
  };
  const mainDef = S.equip.weapon && ITEMS[S.equip.weapon.id];
  const main = weapon(S.equip.weapon, mainDef ? mainDef.weapon : { interval: 1.5, dmg: 1 });
  const offDef = S.equip.offhand && ITEMS[S.equip.offhand.id];
  const off = offDef?.dual ? weapon(S.equip.offhand, offDef.dual) : null;
  return { hp, hpParts, luck, ls: ls + main.ls, main, off, crit: Math.min(100, 5 + luck * 3) };
}
function renderStats() {
  const s = buildStats();
  const tiles = [
    ['hp', 'HP', 'HP', s.hp],
    ['dmg', 'Damage', 'Dmg', Math.round(s.main.dmg * 10) / 10],
    ['spd', 'Speed', 'Spd', `${s.main.interval.toFixed(1)}s`],
    ['crit', 'Crit', 'Crit', `${s.crit}%`],
  ];
  const el = $('stats');
  el.innerHTML = tiles.map(([i, k, sh, v]) => `<div class="stat"><span class="k">${statIcon(i)}<span class="long">${k}</span><span class="short" aria-hidden="true">${sh}</span></span><span class="v">${v}</span></div>`).join('')
    + `<span class="stats-more" aria-hidden="true">${sheetOpen ? 'Hide' : 'All stats'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="${sheetOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}"/></svg></span>`;
  el.setAttribute('aria-expanded', String(sheetOpen));
  if (sheetOpen) renderSheet(s);
}
// Sort each sentence of an item's text by when it happens.
const WHEN = [
  ['start', 'Start of fight', /^Start of fight:\s*/i],
  ['hit', 'On hit', /^On hit:\s*/i],
  ['crit', 'On crit', /^On crit:\s*/i],
  ['whenHit', 'When hit', /^When (hit|attacked):\s*/i],
  ['every', 'Every few seconds', /^Every [\d.]+s:\s*/i],
  ['clutch', 'Clutch (below 30% HP)', /^Clutch:\s*/i],
  ['trigger', 'Triggers', /^(Whenever|When) /i],
  ['passive', 'Always on', /^/],
];
function renderSheet(s) {
  const groups = Object.fromEntries(WHEN.map(([k]) => [k, []]));
  const icon = id => `<img src="${iconFor(id)}" alt="">`;
  for (const slot of ALL_SLOTS) {
    const it = S.equip[slot];
    if (!it) continue;
    const def = ITEMS[it.id];
    const m = itemMods(it);
    for (let sent of def.text.split(/(?<=\.)\s+/)) {
      const [k, , re] = WHEN.find(([, , r]) => r.test(sent));
      let note = '';
      if (k === 'every' && def.cd) {
        const cd = def.cd * (1 - m.cdPct / 100);
        note = `every ${Math.round(cd * 10) / 10}s`;
      }
      if (/^Dual wield:/i.test(sent)) continue;
      // Strip "On hit:"-style labels (the section says it), but keep "Whenever…" sentences whole.
      sent = (k === 'trigger' || k === 'passive' ? sent : sent.replace(re, '')).replace(/\.$/, '');
      groups[k].push({ id: it.id, name: def.name, text: sent.charAt(0).toUpperCase() + sent.slice(1), note });
    }
    for (const l of it.pot?.lines ?? []) {
      const g = l.k === 'onHit' ? 'hit' : ['shield', 'heat', 'thorns', 'slow', 'sand'].includes(l.k) ? 'start' : l.k === 'clutchShield' ? 'clutch' : null;
      if (g) groups[g].push({ id: it.id, name: `${def.name} · potential`, text: lineText(l).replace(/^(On hit|Clutch|Start):\s*/i, '').replace(/^Start with/, 'Gain') });
    }
    if (m.shield && it.up?.st?.ward) groups.start.push({ id: it.id, name: `${def.name} · Ward`, text: `Gain ${(it.up.st.ward) * 4} Shield` });
  }
  // What you actually start with, read from a zero-length fight so every item and upgrade is counted.
  const sim = simulate({ name: 'You', equip: S.equip }, { name: 'Dummy', equip: emptyEquip(), hp: 9999 }, ITEMS, 1, { maxTime: 0.1 });
  const you = {}, foe = {};
  for (const e of sim.events) {
    if (e.t > 0) break;
    if (e.type === 'shield' && e.side === 'A') you.Shield = (you.Shield ?? 0) + e.n;
    if (e.type === 'boon' && e.side === 'A') { const n = e.k === 'ls' ? 'Lifesteal' : STATUS_NAME[e.k]; you[n] = (you[n] ?? 0) + (e.k === 'ls' ? e.n * 100 : e.n); }
    if (e.type === 'status' && e.side === 'B') foe[STATUS_NAME[e.st]] = (foe[STATUS_NAME[e.st]] ?? 0) + e.n;
  }
  const fmtBag = (o, pctKey) => Object.entries(o).map(([k, v]) => kwText(`${Math.round(v)}${k === pctKey ? '%' : ''} ${k}`)).join(', ');
  const startLine = [Object.keys(you).length && `You gain ${fmtBag(you, 'Lifesteal')}`, Object.keys(foe).length && `the enemy gets ${fmtBag(foe)}`].filter(Boolean).join('; ');
  const row = (i, label, v, sub = '') => `<div class="ss-row">${statIcon(i)}<span class="ss-k">${label}</span><span class="ss-v">${v}</span>${sub ? `<span class="ss-sub">${sub}</span>` : ''}</div>`;
  const dps = w => (w.dmg / w.interval).toFixed(1);
  const critExtra = S.equip.helm && ITEMS[S.equip.helm.id].mods?.critMult ? ` (×2.5 at 10+ Luck from ${ITEMS[S.equip.helm.id].name})` : '';
  const core = [
    row('hp', 'Max HP', s.hp, s.hpParts.length ? `100 base, ${s.hpParts.join(', ')}` : '100 base'),
    row('dmg', 'Weapon damage', Math.round(s.main.dmg * 10) / 10, s.main.name),
    row('spd', 'Attack time', `${s.main.interval.toFixed(2)}s`, `${(1 / s.main.interval).toFixed(2)} attacks per second`),
    row('dmg', 'Weapon damage per second', dps(s.main), `before crits${s.off ? `, plus ${dps(s.off)} from ${s.off.name}` : ''}`),
    s.off && row('dmg', 'Offhand weapon', `${Math.round(s.off.dmg * 10) / 10} / ${s.off.interval.toFixed(1)}s`, s.off.name),
    row('crit', 'Crit chance', `${s.crit}%`, `5% base + 3% per Luck`),
    row('crit', 'Crit damage', `×${s.main.critMult}`, `weapon crits${critExtra}`),
    row('luck', 'Luck', s.luck, 'also +3% to every chance-based effect'),
    row('ls', 'Lifesteal', `${Math.round(s.ls * 10) / 10}%`, 'of weapon damage, from upgrades and weapon'),
  ].filter(Boolean).join('');
  const sections = WHEN.filter(([k]) => groups[k].length).map(([k, label]) => `<section class="ss-sec"><h3>${label}</h3>${k === 'start' && startLine ? `<p class="ss-total">${startLine}.</p>` : ''}<ul>${groups[k].map(g => `<li>${icon(g.id)}<span><b>${g.name}</b>${g.note ? ` <span class="ss-note">${g.note}</span>` : ''}<br>${kwText(g.text)}</span></li>`).join('')}</ul></section>`).join('');
  const startOnly = !groups.start.length && startLine ? `<section class="ss-sec"><h3>Start of fight</h3><p class="ss-total">${startLine}.</p></section>` : '';
  $('stat-sheet').innerHTML = `<div class="ss-head"><h3>All stats</h3><button type="button" class="sheet-x" id="ss-close" aria-label="Close all stats">&times;</button></div>
    <div class="ss-core">${core}</div>${startOnly}${sections || '<p class="ss-empty">Equip items to see what they do in a fight.</p>'}`;
}
function toggleSheet(open = !sheetOpen) {
  sheetOpen = open;
  $('stat-sheet').hidden = !open;
  renderStats();
}
$('stats').addEventListener('click', () => toggleSheet());
$('stats').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSheet(); } });
$('stat-sheet').addEventListener('click', e => { if (e.target.closest('#ss-close')) toggleSheet(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen && enchantEl.hidden) toggleSheet(false); });
const card = $('card'), actions = $('actions');
let ttItem = null;
function renderInspector() {
  const loc = S.sel;
  const item = getItem(loc);
  if (!item) {
    sheet.classList.remove('open');
    ttItem = null;
    card.innerHTML = '<p class="c-empty">Select an item to inspect it.</p>';
    actions.innerHTML = '';
    return;
  }
  ttItem = item.id;
  const [w, k] = loc.split(':');
  const btn = (act, label, primary, extra = '') => `<button type="button" class="btn${primary ? ' primary' : ''}" data-act="${act}" ${extra}>${label}</button>`;
  if (isUse(item.id)) {
    const def = USE[item.id];
    const price = w === 'ench' ? enchPrice(item) : def.price;
    card.innerHTML = `<span class="c-name r-${def.rarity}">${def.name}</span>
      <div class="chips"><span class="chip">Enchanter</span><span class="chip">${{ scroll: 'Scroll', chaos: 'Scroll', hammer: 'Hammer', cube: 'Cube', lock: 'Lockstone' }[def.kind]}</span><span class="chip">${RARITY_NAME[def.rarity]}</span></div>
      <p class="c-effect">${kwText(def.text)}</p>
      <span class="c-value">${w === 'ench' ? `In the Enchanter · Costs ${price} gold${item.lucky ? ' (Lucky Merchant: 1 off)' : ''}` : `In your Use row · ${item.n} held · Sells for ${sellValue(item)} each`}</span>`;
    if (w === 'ench') actions.innerHTML = btn('buyuse', `${COIN.replace('<svg', '<svg width="16" height="16"')}Buy for ${price}`, true, S.gold < price ? 'aria-disabled="true"' : '');
    else actions.innerHTML = (def.kind === 'lock' ? '' : btn('use', 'Use on an item', true)) + btn('sell', `Sell 1 for ${sellValue(item)}`, false);
    return;
  }
  const def = ITEMS[item.id];
  const where = w === 'shop' ? 'In the market' : w === 'bag' ? 'In your bag' : `Equipped · ${SLOT_NAME[k]}`;
  const value = w === 'shop' ? `Costs ${def.price} gold` : `Sells for ${sellValue(item)} gold`;
  card.innerHTML = `<span class="c-name r-${def.rarity}">${def.name}</span>
    <div class="chips">${def.schools.map(sc => `<span class="chip">${schoolDot(sc)}${sc}</span>`).join('')}<span class="chip">${slotLabel(def)}</span><span class="chip">${RARITY_NAME[def.rarity]}</span></div>
    <span class="c-stats">${statLine(def)}</span>
    <p class="c-effect">${kwText(def.text)}</p>
    ${w === 'shop' ? '' : upgradeHTML(item)}
    <span class="c-value">${where} · ${value}</span>`;
  if (w === 'shop') {
    const o = S.shop[+k];
    actions.innerHTML = btn('buy', `${COIN.replace('<svg', '<svg width="16" height="16"')}Buy for ${def.price}`, true, S.gold < def.price ? 'aria-disabled="true"' : '')
      + btn('lock', o.locked ? 'Unlock' : 'Lock offer', false);
  } else if (w === 'bag') {
    actions.innerHTML = btn('equip', 'Equip', true) + btn('sell', `Sell for ${sellValue(item)}`, false);
  } else {
    actions.innerHTML = btn('unequip', 'Take off', true) + btn('sell', `Sell for ${sellValue(item)}`, false);
  }
}
function render() {
  const focusLoc = document.activeElement?.dataset?.loc;
  renderTop();
  renderEquip();
  renderBag();
  renderShop();
  renderStats();
  renderInspector();
  markTargets();
  if (focusLoc) document.querySelector(`[data-loc="${focusLoc}"]`)?.focus({ preventScroll: true });
  ttDirty = true;
}
function commit() {
  render();
  dressHero(hero, S.equip, ITEMS, freshUid);
  freshUid = null;
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hide');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hide'), 2600);
}
function bumpGold() {
  const g = $('gold');
  g.classList.remove('bump');
  void g.offsetWidth;
  g.classList.add('bump');
}

/* ---------- Tooltip ---------- */
const tip = $('tip');
function showTipFor(el, def, item = null) {
  tip.innerHTML = isUse(def.id)
    ? `<span class="t-name r-${def.rarity}">${def.name}</span><span class="t-meta">Enchanter · ${RARITY_NAME[def.rarity]}${item?.n > 1 ? ` · ${item.n} held` : ''}</span><span>${def.text}</span>`
    : `<span class="t-name r-${def.rarity}">${def.name}</span>
    <span class="t-meta">${def.schools.join(' · ')} · ${slotLabel(def)} · ${RARITY_NAME[def.rarity]}</span>
    <span>${statLine(def)}</span><span>${kwText(def.text)}</span>${upgradeHTML(item, true)}`;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.right + 10;
  if (x + tw > window.innerWidth - 8) x = r.left - tw - 10;
  if (x < 8) x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left));
  let y = r.top;
  if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
  tip.style.left = `${x}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}
const hideTip = () => { tip.hidden = true; };
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || drag) return;
  const b = e.target.closest('.item');
  if (b) { const item = getItem(b.dataset.loc); if (item) showTipFor(b, ALL[item.id], item); return; }
  const h = e.target.closest('.hi[data-id], .hi[data-fist]');
  if (h && !itemPinned && !statusTip?.pinned) showItemTip(h);
});
document.addEventListener('pointerout', e => {
  const b = e.target.closest('.item, .hi[data-id], .hi[data-fist]');
  if (b && !b.contains(e.relatedTarget) && !itemPinned && !statusTip?.pinned) hideTip();
});
// Battle panel rows: the item's details, or a note for an unarmed fighter.
let itemPinned = false;
function showItemTip(el) {
  if (el.dataset.id) {
    const eq = el.closest('#hud-B') ? B.ghost?.equip : B.playerEquip;
    showTipFor(el, ITEMS[el.dataset.id], eq?.[el.dataset.slot] ?? null);
    return;
  }
  tip.innerHTML = '<span class="t-name">Fists</span><span class="t-meta">Unarmed</span><span>No weapon equipped: 1 damage every 1.5s.</span>';
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, r.right + 10))}px`;
  tip.style.top = `${Math.max(8, Math.min(window.innerHeight - tip.offsetHeight - 8, r.top))}px`;
}
window.addEventListener('scroll', hideTip, { passive: true });

/* ---------- Drag and drop ---------- */
let drag = null;
let suppressClick = false;
let lastClick = { loc: null, t: 0 };
let sheetTimer = 0;
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.item');
  if (!b || e.button > 0) return;
  drag = { loc: b.dataset.loc, btn: b, x: e.clientX, y: e.clientY, active: false, ghost: null, over: null, target: null };
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    const item = getItem(drag.loc);
    if (!item) { drag = null; return; }
    drag.active = true;
    hideTip();
    document.body.classList.add('dragging');
    drag.btn.classList.add('dragging-src');
    const g = document.createElement('img');
    g.className = 'ghost';
    g.src = iconFor(item.id);
    g.alt = '';
    document.body.append(g);
    drag.ghost = g;
    document.querySelectorAll('.slot[data-drop]').forEach(t => { if (canDrop(drag.loc, t.dataset.drop)) t.classList.add('can-drop'); });
    if (canDrop(drag.loc, 'sell')) $('sellzone').classList.add('can-drop');
  }
  e.preventDefault();
  drag.ghost.style.left = `${e.clientX}px`;
  drag.ghost.style.top = `${e.clientY}px`;
  const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
  const target = under && canDrop(drag.loc, under.dataset.drop) ? under : null;
  const overEl = target && target.dataset.drop === 'sell' ? $('sellzone') : target;
  if (drag.over !== overEl) {
    drag.over?.classList.remove('over');
    overEl?.classList.add('over');
    drag.over = overEl;
    drag.target = target?.dataset.drop || null;
  }
}, { passive: false });
function endDrag(cancelled) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  d.ghost?.remove();
  document.body.classList.remove('dragging');
  document.querySelectorAll('.can-drop, .over').forEach(el => el.classList.remove('can-drop', 'over'));
  d.btn.classList.remove('dragging-src');
  if (!cancelled && d.target) drop(d.loc, d.target);
}
window.addEventListener('pointerup', () => endDrag(false));
window.addEventListener('pointercancel', () => endDrag(true));

/* ---------- Clicks ---------- */
const sheet = document.querySelector('.stack-c');
const sheetMQ = window.matchMedia('(max-width: 1200px)');
const openSheet = () => { if (sheetMQ.matches) sheet.classList.add('open'); };
const closeSheet = () => sheet.classList.remove('open');
document.addEventListener('click', e => {
  if (suppressClick || !enchantEl.hidden) return;
  if (targeting != null) {
    const b = e.target.closest('.item');
    const loc = b?.dataset.loc;
    if (loc && /^(equip|bag):/.test(loc)) {
      const why = useCheck(S.use[targeting].id, getItem(loc));
      if (why) { toast(why); return; }
      const i = targeting;
      stopTargeting();
      openEnchant(i, loc);
      return;
    }
    stopTargeting();
    if (!b) return;
  }
  if (e.target.closest('#forge')) { openForge(); return; }
  const lock = e.target.closest('[data-lock]');
  if (lock) { toggleLock(+lock.dataset.lock); return; }
  const b = e.target.closest('.item');
  if (b) {
    const now = performance.now();
    const loc = b.dataset.loc;
    clearTimeout(sheetTimer);
    if (lastClick.loc === loc && now - lastClick.t < 400) {
      lastClick.loc = null;
      quick(loc);
      return;
    }
    lastClick = { loc, t: now };
    S.sel = loc;
    render();
    // Wait out the double-tap window so the sheet doesn't cover the second tap.
    sheetTimer = setTimeout(openSheet, 380);
    return;
  }
  const a = e.target.closest('[data-act]');
  if (a && S.sel) {
    const loc = S.sel;
    const [, k] = loc.split(':');
    const act = a.dataset.act;
    if (act === 'buy') buy(+k);
    else if (act === 'lock') toggleLock(+k);
    else if (act === 'equip') equipFrom(loc);
    else if (act === 'unequip') unequip(k);
    else if (act === 'sell') sell(loc);
    else if (act === 'buyuse') buyUse(+k);
    else if (act === 'use') startTargeting(+k);
  }
});
$('reroll').addEventListener('click', reroll);
$('sheet-close').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!enchantEl.hidden) closeEnchant();
  else if (targeting != null) stopTargeting();
  else closeSheet();
});
const tt = $('turntable');
const ttCtx = tt.getContext('2d');
function syncTTSeg() {
  document.querySelectorAll('[data-style-seg] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.ttStyle)));
  for (const el of [tt, $('hero'), $('arena')]) el.classList.toggle('pixel', S.ttStyle === 'pixel');
  document.documentElement.classList.toggle('maple', S.ttStyle === 'pixel');
  document.documentElement.classList.toggle('dark', S.pixelDark);
  document.querySelectorAll('[data-theme-seg] button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === 'dark') === S.pixelDark)));
  restyleArena();
}
document.querySelectorAll('[data-theme-seg]').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.pixelDark = b.dataset.v === 'dark';
  try { localStorage.setItem('pixelDark', S.pixelDark ? '1' : '0'); } catch { /* storage unavailable */ }
  syncTTSeg();
}));
document.querySelectorAll('[data-style-seg]').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.dataset.v === S.ttStyle) return;
  S.ttStyle = b.dataset.v;
  try { localStorage.setItem('artStyle', S.ttStyle); } catch { /* storage unavailable */ }
  syncTTSeg();
  ttDirty = true;
  restyleHeroes();
  render();
  document.querySelectorAll('.hi[data-id] img').forEach(img => { img.src = iconFor(img.closest('.hi').dataset.id); });
}));

/* =========================================================
   Market character
   ========================================================= */
const stage = $('stage');
const heroCanvas = $('hero');
const hr = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true });
hr.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
hr.setClearColor(0x000000, 0);
const hs = new THREE.Scene();
heroLights(hs);
const hc = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
let hero = buildHero(lookOf(P), matFor(S.ttStyle));
hs.add(hero.root);
const hpx = new PixelPass(hr);
hs.add(pedestal());
let heroYaw = 0.38;
function sizeHero() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  hr.setSize(w, h, false);
  hpx.setSize(w, h);
  hc.aspect = w / h;
  const tanH = Math.tan(THREE.MathUtils.degToRad(hc.fov / 2));
  const d = Math.max(1.6 / tanH, 1.05 / (tanH * hc.aspect));
  hc.position.set(0, 1.2 + d * 0.06, d);
  hc.lookAt(0, 1.08, 0);
  hc.updateProjectionMatrix();
}
new ResizeObserver(sizeHero).observe(stage);
{
  let dragX = null;
  heroCanvas.addEventListener('pointerdown', e => { dragX = e.clientX; heroCanvas.setPointerCapture(e.pointerId); });
  heroCanvas.addEventListener('pointermove', e => { if (dragX === null) return; heroYaw += (e.clientX - dragX) * 0.012; dragX = e.clientX; });
  const end = () => { dragX = null; };
  heroCanvas.addEventListener('pointerup', end);
  heroCanvas.addEventListener('pointercancel', end);
}

/* =========================================================
   Battle
   ========================================================= */
const screenEl = $('screen');
const arenaStage = $('arena-stage');
const arenaCanvas = $('arena');
const ar = new THREE.WebGLRenderer({ canvas: arenaCanvas, antialias: true, alpha: true });
ar.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
ar.setClearColor(0x000000, 0);
const as = new THREE.Scene();
heroLights(as);
const ac = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
const floor = mesh(new THREE.CircleGeometry(4.2, 40), MS(0x2a2119), [0, -0.17, 0], [-Math.PI / 2, 0, 0]);
as.add(floor);
as.add(mesh(new THREE.TorusGeometry(3.2, 0.03, 6, 60), MS(0xc09450, { glow: 0.25 }), [0, -0.16, 0], [Math.PI / 2, 0, 0]));
// Pixel mode stages the fight on a grassy field under the sky backdrop.
function restyleArena() {
  floor.material = S.ttStyle === 'pixel' ? MP(S.pixelDark ? 0x3d6a45 : 0x7dbb5a) : MS(0x2a2119);
}
const GHOST_LOOK = { skin: 0xc4bfe6, hair: 0x5a5a8a, tunic: 0x6a5a8a, eyes: 0x8fe3ff, eyesGlow: 0.9, blush: 0x9a8fd0 };
const F = { A: null, B: null };
const particles = new Particles(as);
// Burn flames: upright teardrops that glow (additive) and never spin.
const flameGeo = (() => {
  const g = new THREE.ConeGeometry(0.55, 1.8, 6, 1);
  g.translate(0, 0.5, 0);
  const base = new THREE.SphereGeometry(0.55, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  base.translate(0, -0.4, 0);
  const merged = new THREE.BufferGeometry();
  const pos = [...g.toNonIndexed().attributes.position.array, ...base.toNonIndexed().attributes.position.array];
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return merged;
})();
const flames = new Particles(as, 220, { geo: flameGeo, spin: false, opacity: 0.85, additive: true });
// Poison bubbles: thin rings that always face the camera.
const bubbles = new Particles(as, 160, { geo: new THREE.TorusGeometry(1, 0.17, 4, 14), spin: false, opacity: 0.85 });
const apx = new PixelPass(ar);
const bolts = new Bolts(as, particles);
const HOME_X = 1.5;
function collectMats(root) {
  const set = new Set();
  root.traverse(o => {
    if (o.isMesh && o.material && o.material.emissive && !o.userData.fx) set.add(o.material);
  });
  const mats = [...set];
  for (const mt of mats) { mt.userData.em0 = mt.emissive.clone(); mt.userData.ei0 = mt.emissiveIntensity; }
  return mats;
}
function weaponStyle(equip, main) {
  if (!main) return 'dual';
  const w = equip.weapon && ITEMS[equip.weapon.id].weapon;
  if (!w) return 'fist';
  return w.hands === 2 ? '2h' : '1h';
}
function weaponColor(equip, main) {
  const e = main ? equip.weapon : equip.offhand;
  if (!e) return 0xfff4e0;
  const sc = ITEMS[e.id].schools[0];
  return { Fire: 0xffa050, Frost: 0xbfefff, Venom: 0xb8f070, Desert: 0xffe0a0, Holy: 0xfff0b0, Blood: 0xff7080, Fortune: 0x9ff0c8, Prismatic: 0xf0c0ff }[sc] ?? 0xfff4e0;
}
function makeFighterView(side, equip, look) {
  const h = buildHero(look, matFor(S.ttStyle));
  dressHero(h, equip, ITEMS);
  const dir = side === 'A' ? 1 : -1;
  const holder = new THREE.Group();
  holder.position.x = -dir * HOME_X;
  const ped = pedestal();
  const pedWrap = new THREE.Group();
  pedWrap.add(ped);
  pedWrap.position.x = -dir * HOME_X;
  as.add(pedWrap);
  h.root.rotation.y = dir * 0.8;
  holder.add(h.root);
  const ice = iceBlock();
  ice.visible = false;
  ice.traverse(o => { o.userData.fx = true; });
  holder.add(ice);
  const fx = fighterFx(dir);
  holder.add(fx.group);
  as.add(holder);
  return {
    side, equip, look, hero: h, holder, pedWrap, ice, fx, dir, x: -dir * HOME_X, mats: collectMats(h.root),
    attack: null, cast: null, knock: 0, dodge: 0, flash: 0, flashColor: new THREE.Color(1, 1, 1), flashOn: false,
    pulse: 0, clutch: 0, iceK: 0, emit: { burn: 0, poison: 0, frost: 0, sand: 0, heat: 0, luck: 0 }, snails: 0, dead: false, deathT: 0, win: false, winT: 0,
  };
}
function clearArena() {
  for (const k of ['A', 'B']) if (F[k]) { as.remove(F[k].holder); as.remove(F[k].pedWrap); F[k] = null; }
  particles.clear();
  bubbles.clear();
  flames.clear();
  $('floats').querySelectorAll('.snail').forEach(el => el.remove());
  bolts.clear();
}
const camBase = new THREE.Vector3();
function sizeArena() {
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  if (!w || !h) return;
  ar.setSize(w, h, false);
  apx.setSize(w, h);
  ac.aspect = w / h;
  const tanH = Math.tan(THREE.MathUtils.degToRad(ac.fov / 2));
  const d = Math.max(1.75 / tanH, 2.9 / (tanH * ac.aspect));
  camBase.set(0, 1.25 + d * 0.12, d);
  ac.position.copy(camBase);
  ac.lookAt(0, 1.0, 0);
  ac.updateProjectionMatrix();
}
new ResizeObserver(sizeArena).observe(arenaStage);

const B = { sim: null, ghost: null, T: 0, speed: 1, ei: 0, ai: 0, fi: -1, done: false, playing: false, flash: {}, playerEquip: null, hitStop: 0, shake: 0, banner: false };
const INTRO = 1.0, LEAD = 0.24, REC = 0.3;
function hudHTML(side, name, sub, equip) {
  const rows = [];
  const order = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
  if (!equip.weapon) rows.push(`<li><button type="button" class="hi" data-slot="weapon" data-fist="1" aria-label="Fists: what they do"><span class="fist" aria-hidden="true">✊</span><div><div class="nm">Fists</div><div class="cd"><i></i></div></div></button></li>`);
  for (const slot of order) {
    const e = equip[slot];
    if (!e) continue;
    const def = ITEMS[e.id];
    const timed = def.weapon || def.dual || def.cd;
    rows.push(`<li><button type="button" class="hi" data-slot="${slot}" data-id="${e.id}" aria-label="${def.name}: what it does"><img src="${iconFor(e.id)}" alt=""><div><div class="nm r-${def.rarity}">${def.name}${steps(e) ? ` <span class="hup">${signed(steps(e))}</span>` : ''}${e.pot ? ` <span class="b-pot inline t${e.pot.tier}"></span>` : ''}</div>${timed ? '<div class="cd"><i></i></div>' : ''}</div></button></li>`);
  }
  return `<div class="hud-head"><span class="hud-name">${name}</span><span class="hud-sub">${sub}</span></div>
    <div class="hpbar"><div class="hp-lag"></div><div class="hp-fill"></div><div class="hp-sh"></div><span class="hp-text"></span></div>
    <div class="schips"></div>
    <ul class="hud-items">${rows.join('')}</ul>`;
}
// ex: an exhibition against another player's Hall of Fame avatar { equip, ghost, look, backdrop }.
function startBattle(ex = null) {
  closeSheet();
  hideTip();
  statusTip = null;
  const ghost = ex ? ex.ghost : makeGhost(S.day, rng);
  if (!ex) upgradeGhost(ghost, S.day, rng);
  const src = ex ? ex.equip : S.equip;
  const playerEquip = Object.fromEntries(ALL_SLOTS.map(k => [k, src[k] ? { ...src[k] } : null]));
  const seed = Math.floor(rng() * 2 ** 31);
  const sim = simulate({ name: 'You', equip: playerEquip }, { name: ghost.name, equip: ghost.equip }, ITEMS, seed);
  Object.assign(B, { ex, sim, ghost, T: -INTRO, ei: 0, ai: 0, fi: -1, done: false, playing: true, flash: {}, playerEquip, fatigueShown: false, hitStop: 0, shake: 0, banner: false });
  clearArena();
  F.A = makeFighterView('A', playerEquip, lookOf(P));
  F.B = makeFighterView('B', ghost.equip, ex ? ex.look : GHOST_LOOK);
  $('hud-A').innerHTML = hudHTML('A', playerName(), ex ? 'Exhibition set' : `Day ${S.day} build`, playerEquip);
  setBackdrop($('bd-a'), P.backdrop);
  setBackdrop($('bd-b'), ex ? ex.backdrop : BACKDROPS[Math.floor(rng() * BACKDROPS.length)][0]);
  $('hud-B').innerHTML = hudHTML('B', ghost.name, ex ? 'Hall of Fame' : `Ghost · Day ${S.day}`, ghost.equip);
  $('vs-a').textContent = playerName();
  $('vs-b').textContent = ghost.name;
  $('log').innerHTML = '';
  $('floats').innerHTML = '';
  for (const side of ['A', 'B']) {
    const bar = document.createElement('div');
    bar.className = `ohp ${side === 'B' ? 'b' : ''}`;
    bar.id = `ohp-${side}`;
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i class="ohp-lag"></i><i class="ohp-fill"></i><i class="ohp-sh"></i><span class="ohp-n"></span>';
    $('floats').append(bar);
  }
  $('result').hidden = true;
  $('fight').disabled = true;
  $('fight').textContent = 'Fighting';
  screenEl.classList.add('in-battle');
  screenEl.classList.toggle('ex', !!ex);
  $('phase').textContent = ex ? 'Exhibition' : 'Battle';
  sizeArena();
  logLine(ex ? `<b>${ghost.name}</b> steps up with their Hall of Fame set (${ghost.schools.join(' and ')}).` : `<b>${ghost.name}</b> enters: a ${ghost.schools.join(' and ')} build.`);
  updateHud(true);
}

const hudCache = { A: {}, B: {} };
// Health bars that float above each fighter in the arena, following them as they lunge.
function updateOverheads() {
  const fr = B.sim?.frames[Math.max(0, B.fi)];
  if (!fr) return;
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  for (const side of ['A', 'B']) {
    const el = $(`ohp-${side}`), f = F[side];
    if (!el || !f) continue;
    const s = fr[side];
    _p.set(f.holder.position.x, 2.5, 0).project(ac);
    el.style.left = `${((_p.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - _p.y) / 2) * h}px`;
    const pct = s.maxHp ? Math.max(0, s.hp / s.maxHp) : 0;
    const fill = el.querySelector('.ohp-fill');
    fill.style.width = `${(pct * 100).toFixed(1)}%`;
    fill.className = `ohp-fill${pct < 0.3 ? ' low' : pct < 0.6 ? ' mid' : ''}`;
    el.querySelector('.ohp-lag').style.width = `${(pct * 100).toFixed(1)}%`;
    el.querySelector('.ohp-sh').style.width = `${Math.min(100, (s.shield / s.maxHp) * 100).toFixed(1)}%`;
    const txt = `${Math.ceil(s.hp)}${s.shield >= 1 ? ` +${Math.round(s.shield)}` : ''}`;
    const t = el.querySelector('.ohp-n');
    if (t.textContent !== txt) t.textContent = txt;
  }
}
function updateHud(force) {
  const fi = Math.max(0, Math.min(B.sim.frames.length - 1, Math.floor(B.T / 0.1 + 1e-6)));
  if (fi === B.fi && !force) return;
  B.fi = fi;
  const fr = B.sim.frames[fi];
  for (const side of ['A', 'B']) {
    const s = fr[side];
    const root = $(`hud-${side}`);
    const pct = s.maxHp ? Math.max(0, s.hp / s.maxHp) : 0;
    const fill = root.querySelector('.hp-fill');
    fill.style.width = `${(pct * 100).toFixed(1)}%`;
    root.querySelector('.hp-lag').style.width = `${(pct * 100).toFixed(1)}%`;
    fill.className = `hp-fill${pct < 0.3 ? ' low' : pct < 0.6 ? ' mid' : ''}`;
    root.querySelector('.hp-sh').style.width = `${Math.min(100, (s.shield / s.maxHp) * 100).toFixed(1)}%`;
    root.querySelector('.hp-text').textContent = `${Math.ceil(s.hp)} / ${Math.round(s.maxHp)}${s.shield >= 1 ? ` · Shield ${Math.round(s.shield)}` : ''}`;
    const chips = [];
    if (s.frozen) chips.push(['frozen', 'Frozen']);
    for (const k of ['burn', 'poison', 'frost', 'slow', 'sand']) if (s.st[k] > 0) chips.push([k, k === 'frost' ? `${s.st.frost}/10` : s.st[k]]);
    if (s.heat > 0) chips.push(['heat', s.heat]);
    if (s.luck > 0) chips.push(['luck', s.luck]);
    if (s.thorns > 0) chips.push(['thorns', s.thorns]);
    const html = chips.map(([k, v]) => `<button type="button" class="schip${k === 'frozen' ? ' frozen' : ''}" data-st="${k}" data-side="${side}" style="--sc: var(${STATUS_VAR[k]})" aria-label="${STATUS_NAME[k] ?? 'Frozen'} ${k === 'frozen' ? '' : v}: what it does"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICON[k]}</svg>${v}</button>`).join('');
    if (hudCache[side].chips !== html) { root.querySelector('.schips').innerHTML = html; hudCache[side].chips = html; }
    if (statusTip && statusTip.side === side) refreshStatusTip(fr);
    for (const c of s.cds) {
      const bar = root.querySelector(`.hi[data-slot="${c.slot}"] .cd i`);
      if (bar) bar.style.width = `${(c.p * 100).toFixed(0)}%`;
    }
  }
  const clock = $('clock');
  clock.textContent = `${Math.max(0, B.T).toFixed(1)}s${fr.t >= 25 ? ' · Fatigue' : ''}`;
  clock.classList.toggle('fatigue', fr.t >= 25);
}

/* ---------- Status explanations ---------- */
function statusInfo(k, s) {
  const pct = n => `${Math.round(n * 100)}%`;
  const n = k === 'frozen' ? 0 : k === 'heat' ? s.heat : k === 'luck' ? s.luck : k === 'thorns' ? s.thorns : s.st[k];
  switch (k) {
    case 'burn': return [`Burn ${n}`, `Takes ${n} damage per second, dealt continuously, and loses 1 stack each second. Burn hits Shield first, and healing is ${pct(1 - RULES.BURN_HEAL_CUT)} weaker while burning.`];
    case 'poison': return [`Poison ${n}`, `Takes ${n} damage every ${RULES.POISON_EVERY}s (${Math.round((n / RULES.POISON_EVERY) * 10) / 10} per second), dealt continuously. Loses 1 stack every ${RULES.POISON_DECAY}s, caps at ${RULES.POISON_CAP}, and ignores Shield.`];
    case 'frost': return [`Frost ${n} / ${RULES.FREEZE_AT}`, `${RULES.FREEZE_AT - n} more Frost freezes this fighter for ${RULES.FREEZE_TIME}s, stopping their weapon and items. After a freeze, Frost can't build for ${RULES.THAW_TIME}s.`];
    case 'slow': return [`Slow ${n}`, `Weapon and items run ${pct(Math.min(n * RULES.SPEED_PER, 0.6))} slower (${pct(RULES.SPEED_PER)} per stack). Loses 1 stack every 2s, and cancels Heat 1 for 1.`];
    case 'sand': return [`Sand ${n}`, `Weapon attacks miss ${pct(Math.min(n, RULES.SAND_CAP) * RULES.SAND_MISS)} of the time (${pct(RULES.SAND_MISS)} per stack, up to ${pct(RULES.SAND_CAP * RULES.SAND_MISS)}). A miss triggers no on-hit effects. Loses 1 stack every 2s.`];
    case 'heat': return [`Heat ${n}`, `Weapon and items run ${pct(n * RULES.SPEED_PER)} faster (${pct(RULES.SPEED_PER)} per stack). Cancels Slow 1 for 1. Caps at ${RULES.HEAT_CAP} unless an item removes the cap.`];
    case 'luck': return [`Luck ${n}`, `Crit chance is ${pct(RULES.BASE_CRIT + n * RULES.LUCK_PER)} (${pct(RULES.BASE_CRIT)} base + ${pct(RULES.LUCK_PER)} per Luck). Every other chance-based effect also gets +${pct(n * RULES.LUCK_PER)}.`];
    case 'thorns': return [`Thorns ${n}`, `Whenever an enemy weapon hit lands, strikes back for ${n}. Misses don't trigger it. Thorns damage hits Shield first, never triggers on-hit or when-hit effects, and doesn't wear off. Caps at ${RULES.THORNS_CAP}.`];
    case 'frozen': return ['Frozen', `Weapon and items are stopped for up to ${RULES.FREEZE_TIME}s. Burn and Poison still tick.`];
  }
  return [k, ''];
}
let statusTip = null;
function showStatusTip(el, pinned) {
  const side = el.dataset.side, k = el.dataset.st;
  statusTip = { side, k, pinned };
  refreshStatusTip(B.sim.frames[Math.max(0, B.fi)]);
}
function refreshStatusTip(fr) {
  if (!statusTip || !fr) return;
  const el = $(`hud-${statusTip.side}`).querySelector(`.schip[data-st="${statusTip.k}"]`);
  if (!el) { hideStatusTip(); return; }
  const [title, body] = statusInfo(statusTip.k, fr[statusTip.side]);
  tip.innerHTML = `<span class="t-name" style="color: var(${STATUS_VAR[statusTip.k]})">${title}</span><span class="t-meta">${statusTip.side === 'A' ? 'On you' : `On ${B.ghost.name}`}</span><span>${body}</span>`;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left));
  let y = r.bottom + 8;
  if (y + th > window.innerHeight - 8) y = Math.max(8, r.top - th - 8);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}
function hideStatusTip() { statusTip = null; itemPinned = false; tip.hidden = true; }
document.addEventListener('click', e => {
  const chip = e.target.closest('.schip[data-st]');
  if (chip) { itemPinned = false; showStatusTip(chip, true); return; }
  const row = e.target.closest('.hi[data-id], .hi[data-fist]');
  if (row) { statusTip = null; itemPinned = true; showItemTip(row); return; }
  if (statusTip || itemPinned) hideStatusTip();
}, true);
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || statusTip?.pinned) return;
  const chip = e.target.closest('.schip[data-st]');
  if (chip) showStatusTip(chip, false);
});
document.addEventListener('pointerout', e => {
  const chip = e.target.closest('.schip[data-st]');
  if (chip && statusTip && !statusTip.pinned && !chip.contains(e.relatedTarget)) hideStatusTip();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (statusTip || itemPinned)) hideStatusTip(); });

const sideName = side => (side === 'A' ? 'You' : B.ghost.name);
function logLine(html, at = B.T) {
  const log = $('log');
  const li = document.createElement('li');
  li.innerHTML = `<span class="t">${Math.max(0, at).toFixed(1)}s</span>${html}`;
  log.append(li);
  while (log.children.length > 80) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
let floatCount = 0;
const _p = new THREE.Vector3();
function floatText(side, text, color, cls = '') {
  if (floatCount > 26) return;
  const f = F[side];
  _p.set(f.holder.position.x, 2.35, 0).project(ac);
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  const el = document.createElement('span');
  el.className = `float ${cls}`;
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${((_p.x + 1) / 2) * w + (rng() - 0.5) * 70}px`;
  el.style.top = `${((1 - _p.y) / 2) * h + (rng() - 0.5) * 30}px`;
  $('floats').append(el);
  floatCount++;
  setTimeout(() => { el.remove(); floatCount--; }, 1150);
}
// Small, quiet numbers for Burn and Poison as they drain, drifting off the body to one side.
const DOT_COLOR = { burn: '#ff7a52', poison: '#8fd46a' };
function dotFloat(side, n, kind) {
  if (floatCount > 26) return;
  const f = F[side];
  _p.set(f.holder.position.x + (Math.random() - 0.5) * 0.5, 1.15 + Math.random() * 0.5, 0.2).project(ac);
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  const el = document.createElement('span');
  el.className = `float dot ${kind}`;
  el.textContent = n;
  el.style.color = DOT_COLOR[kind];
  el.style.left = `${((_p.x + 1) / 2) * w}px`;
  el.style.top = `${((1 - _p.y) / 2) * h}px`;
  el.style.setProperty('--dx', `${(-f.dir * (10 + Math.random() * 22)).toFixed(0)}px`);
  $('floats').append(el);
  floatCount++;
  setTimeout(() => { el.remove(); floatCount--; }, 1400);
}
// Slow: little snail outlines that creep off the fighter's feet.
const SNAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 18.5h13.5c1.9 0 3.2-1.3 3.2-3.2v-1.6"/><path d="M19.2 13.7l1.4-3.4M19.2 13.7l-.7-3.6"/><circle cx="10" cy="12.5" r="5.3"/><path d="M10 12.5c0-.9.7-1.5 1.5-1.4.9.1 1.4.9 1.3 1.8-.2 1.3-1.4 2-2.6 1.9-1.6-.2-2.6-1.6-2.4-3.2"/></svg>';
function spawnSnail(f) {
  if (f.snails >= 3) return;
  // Beside the feet on the outer side, so they creep away from the fight instead of covering the body.
  _p.set(f.holder.position.x - f.dir * (0.38 + Math.random() * 0.22), 0.08 + Math.random() * 0.12, 0.4).project(ac);
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  const el = document.createElement('span');
  el.className = 'snail';
  el.innerHTML = SNAIL;
  el.style.left = `${((_p.x + 1) / 2) * w}px`;
  el.style.top = `${((1 - _p.y) / 2) * h}px`;
  el.style.setProperty('--dx', `${(-f.dir * (16 + Math.random() * 18)).toFixed(0)}px`);
  el.style.setProperty('--flip', f.dir > 0 ? -1 : 1);
  $('floats').append(el);
  f.snails++;
  setTimeout(() => { el.remove(); f.snails--; }, 3200);
}
const KIND_COLOR = { hit: '#fff4e0', burn: '#ff9a4a', poison: '#a8e05a', pure: '#e9b8ff', reflect: '#ffd27a', fatigue: '#d08aff', self: '#ff8a8a', thorns: '#f08cb0' };
const ST_COLOR = { burn: [0xff8a2a, 0xffc04a], poison: [0x8bd34a, 0x5aa83a], frost: [0xbfefff, 0x7fd6ff], slow: [0x7fb0ff, 0xa8c8ff], sand: [0xdbb470, 0xc9a060] };
function fxDamage(e) {
  const f = F[e.side];
  const atk = F[e.side === 'A' ? 'B' : 'A'];
  const x = f.holder.position.x, y = 1.05, z = 0.15;
  if (e.kind === 'hit' || e.kind === 'reflect') {
    f.knock = e.crit ? 1.4 : 1;
    f.flash = e.crit ? 1 : 0.75;
    f.flashColor.set(e.crit ? 0xffe08a : 0xffffff);
    const c = weaponColor(atk.equip, true);
    particles.burst(x + f.dir * 0.1, y, z, e.crit ? 26 : 12, [c, 0xffffff], { max: e.crit ? 4.5 : 3, size: e.crit ? 0.06 : 0.045, life: 0.3, flat: 1 });
    if (e.absorbed >= 1) { f.pulse = 1; particles.burst(x, y, z, 8, [0x8fd0ff, 0xffffff], { max: 2.5, life: 0.3 }); }
    if (e.crit && !reduceMotion) { B.hitStop = 0.11; B.shake = 1; }
  } else if (e.kind === 'burn') {
    particles.burst(x, y, z, 6, ST_COLOR.burn, { max: 1.8, up: 1.2, g: 0, life: 0.45 });
    f.flash = Math.max(f.flash, 0.35); f.flashColor.set(0xff8a2a);
  } else if (e.kind === 'poison') {
    particles.burst(x, y, z, 6, ST_COLOR.poison, { max: 1.2, up: 0.6, g: 0, life: 0.6 });
    f.flash = Math.max(f.flash, 0.35); f.flashColor.set(0x8bd34a);
  } else if (e.kind === 'thorns') {
    f.knock = Math.max(f.knock, 0.45);
    f.flash = Math.max(f.flash, 0.5); f.flashColor.set(0xf08cb0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      particles.emit({ x, y, z, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 0, drag: 5, life: 0.3, size: 0.045, color: i % 2 ? 0xf08cb0 : 0xe9d9b0 });
    }
  } else if (e.kind === 'fatigue') {
    particles.burst(x, 0.3, 0, 8, [0xb070ff, 0x7040c0], { max: 1, up: 1.5, g: 0, life: 0.7 });
  } else {
    particles.burst(x, y, z, 8, [0xe9b8ff, 0xffffff], { max: 2, life: 0.35 });
    f.flash = Math.max(f.flash, 0.4); f.flashColor.set(0xe9b8ff);
  }
}
function playEvent(e, quiet) {
  const other = s => (s === 'A' ? 'B' : 'A');
  const log = html => logLine(html, e.t);
    const verb = (side, you, them) => (side === 'A' ? you : them);
  switch (e.type) {
    case 'attack':
      break;
    case 'dmg': {
      const n = Math.round(e.n);
      if (e.dot) { if (!quiet && n > 0) dotFloat(e.side, n, e.kind); break; }
      if (!quiet && n > 0) {
        floatText(e.side, `${e.crit ? 'Crit ' : ''}${n}`, KIND_COLOR[e.kind] ?? '#fff', e.crit ? 'big' : e.kind === 'hit' ? '' : 'small');
        fxDamage(e);
      }
      if (e.kind === 'hit') log(`<b>${sideName(other(e.side))}</b> hit <b>${sideName(e.side)}</b> for ${n}${e.crit ? ' <span class="crit">(crit)</span>' : ''}${e.absorbed >= 1 ? `, ${Math.round(e.absorbed)} blocked` : ''}.`);
      else if (e.kind === 'burn' || e.kind === 'poison') log(`<span class="k-${e.kind}">${e.kind === 'burn' ? 'Burn' : 'Poison'}</span> deals ${n} to <b>${sideName(e.side)}</b>${e.crit ? ' <span class="crit">(crit)</span>' : ''}.`);
      else if (e.kind === 'pure') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'take', 'takes')} ${n} damage.`);
      else if (e.kind === 'thorns') log(`<span class="k-thorns">${e.side === 'A' ? `<b>${sideName('B')}</b>'s` : 'Your'} Thorns</span> strike <b>${sideName(e.side)}</b> for ${n}${e.crit ? ' <span class="crit">(crit)</span>' : ''}.`);
      else if (e.kind === 'reflect') log(`${e.side === 'A' ? 'Your' : `<b>${sideName(e.side)}</b>'s`} attack is reflected for ${n}.`);
      else if (e.kind === 'self') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'pay', 'pays')} ${n} HP.`);
      break;
    }
    case 'dotTick':
      log(`<span class="k-${e.kind}">${e.kind === 'burn' ? 'Burn' : 'Poison'}</span> dealt ${Math.round(e.n)} to <b>${sideName(e.side)}</b> over ${e.kind === 'burn' ? 'the last second' : `the last ${RULES.POISON_EVERY}s`}.`);
      break;
    case 'miss':
      if (!quiet) { floatText(e.side, 'Miss', '#e8dcc0', 'small'); F[e.side].dodge = 1; }
      log(`<b>${sideName(other(e.side))}</b> missed.`);
      break;
    case 'heal':
      if (!quiet && e.n >= 1) {
        floatText(e.side, `+${Math.round(e.n)}`, '#8fe08a', 'small');
        const f = F[e.side];
        for (let i = 0; i < Math.min(14, 3 + e.n / 2); i++) particles.emit({ x: f.holder.position.x + (Math.random() - 0.5) * 0.6, y: 0.4 + Math.random() * 1.1, z: (Math.random() - 0.5) * 0.4, vy: 0.9 + Math.random() * 0.6, life: 0.8, size: 0.05, color: 0x8fe08a, grow: true });
      }
      break;
    case 'shield':
      if (!quiet && e.n >= 1) {
        floatText(e.side, `+${Math.round(e.n)} Shield`, '#8fd0ff', 'small');
        F[e.side].pulse = 1;
      }
      break;
    case 'status':
      if (!quiet) {
        if (e.n >= 2) floatText(e.side, `+${e.n} ${STATUS_NAME[e.st]}`, getComputedStyle(document.documentElement).getPropertyValue(STATUS_VAR[e.st]) || '#fff', 'small');
        const f = F[e.side];
        particles.burst(f.holder.position.x, 1.0, 0.1, Math.min(10, 2 + e.n), ST_COLOR[e.st], { max: 1.6, life: 0.4, g: 0 });
      }
      break;
    case 'thaw':
      if (!quiet) { const f = F[e.side]; particles.burst(f.holder.position.x, 1.0, 0, 26, [0xbfefff, 0xffffff, 0x7fd6ff], { max: 3.5, size: 0.06, life: 0.5 }); }
      break;
    case 'freeze':
      if (!quiet) {
        floatText(e.side, 'Frozen!', '#9fe2ff', 'banner');
        const f = F[e.side];
        particles.burst(f.holder.position.x, 1.0, 0, 18, [0xbfefff, 0x7fd6ff], { max: 2.5, size: 0.05, life: 0.45 });
        f.iceK = 0;
      }
      log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'are', 'is')} <span class="k-frost">Frozen</span> for ${e.dur}s.`);
      break;
    case 'clutch':
      if (!quiet) {
        floatText(e.side, 'Clutch!', '#f4c652', 'banner');
        F[e.side].clutch = 1;
        F[e.side].flash = 0.8; F[e.side].flashColor.set(0xf4c652);
        particles.burst(F[e.side].holder.position.x, 0.2, 0, 24, [0xf4c652, 0xffe8a0], { max: 3, up: 2, size: 0.05, life: 0.6 });
      }
      log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'drop', 'drops')} below 30% HP: clutch effects trigger.`);
      break;
    case 'reflect':
      if (!quiet) floatText(e.side, 'Reflected', '#ffd27a', 'small');
      break;
    case 'thorns':
      if (!quiet) {
        const f = F[e.side];
        particles.burst(f.holder.position.x + f.dir * 0.3, 1.0, 0.15, 10, [0xf08cb0, 0xe9d9b0], { max: 3.2, life: 0.25, g: 0, size: 0.04, flat: 1 });
      }
      break;
    case 'fatigue':
      if (!B.fatigueShown) { B.fatigueShown = true; log('<b>Fatigue</b> sets in: both fighters take growing damage each second.'); }
      break;
    case 'trigger': {
      const el = $(`hud-${e.side}`).querySelector(`.hi[data-slot="${e.slot}"]`);
      if (el && !quiet) { el.classList.add('flash'); B.flash[`${e.side}:${e.slot}`] = 0.25; }
      if (!quiet && !e.cast && e.slot !== 'weapon') {
        const f = F[e.side];
        particles.burst(f.holder.position.x, 1.2, 0.2, 6, [0xf4c652, 0xffffff], { max: 1.4, life: 0.35, g: 0, size: 0.03 });
      }
      break;
    }
    case 'end':
      break;
  }
}
/* ---------- Damage breakdown shown with the result ---------- */
const SRC_META = {
  burn: ['Burn', '--s-fire', 'burn'], poison: ['Poison', '--s-venom', 'poison'], thorns: ['Thorns', '--s-thorn', 'thorns'],
  reflect: ['Reflected hits', '--s-desert', null], other: ['Other effects', '--s-prism', null],
};
const stIcon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICON[k]}</svg>`;
function reportRows(stats, equip) {
  return Object.entries(stats.dealt).map(([k, n]) => {
    if (k.startsWith('slot:')) {
      const it = equip[k.slice(5)];
      const def = it && ITEMS[it.id];
      return { n, label: def ? def.name : 'Fists', cls: def ? `r-${def.rarity}` : '', color: 'var(--gold)', icon: def ? `<img src="${iconFor(it.id)}" alt="">` : '<span class="fist" aria-hidden="true">✊</span>' };
    }
    const [label, v, ic] = SRC_META[k] ?? [k, '--parch-dim', null];
    return { n, label, cls: '', color: `var(${v})`, icon: ic ? `<span class="rep-st" style="color: var(${v})">${stIcon(ic)}</span>` : '<span class="rep-st"></span>' };
  }).filter(r => r.n >= 0.5).sort((a, b) => b.n - a.n);
}
function reportHTML() {
  const st = B.sim.stats;
  const sides = [['A', playerName(), B.playerEquip], ['B', B.ghost.name, B.ghost.equip]];
  const rows = Object.fromEntries(sides.map(([k, , eq]) => [k, reportRows(st[k], eq)]));
  const max = Math.max(1, ...Object.values(rows).flat().map(r => r.n));
  const fmt = n => Math.round(n);
  const col = ([k, name]) => {
    const s = st[k];
    const total = rows[k].reduce((a, r) => a + r.n, 0);
    const extras = [
      s.blocked >= 1 && `Shield blocked ${fmt(s.blocked)}`,
      s.healed >= 1 && `Healed ${fmt(s.healed)}${s.lifesteal >= 1 ? ` (${fmt(s.lifesteal)} Lifesteal)` : ''}`,
      s.hits && `${s.crits} crit${s.crits === 1 ? '' : 's'} in ${s.hits} hit${s.hits === 1 ? '' : 's'}`,
      s.missed && `${s.missed} miss${s.missed === 1 ? '' : 'es'}`,
      s.fatigue >= 1 && `Fatigue took ${fmt(s.fatigue)}`,
    ].filter(Boolean);
    return `<section class="rep-side ${k === 'B' ? 'b' : ''}" aria-label="${name}: damage dealt">
      <div class="rep-head"><span class="rep-who">${name}</span><span class="rep-total">${fmt(total)} dealt</span></div>
      <ul class="rep-rows">${rows[k].length ? rows[k].map(r => `<li><span class="rep-ico">${r.icon}</span><span class="rep-name ${r.cls}">${r.label}</span><span class="rep-bar"><i style="width:${((r.n / max) * 100).toFixed(1)}%; background:${r.color}"></i></span><span class="rep-n">${fmt(r.n)}</span></li>`).join('') : '<li class="rep-none">No damage dealt</li>'}</ul>
      ${extras.length ? `<p class="rep-extra">${extras.join(' · ')}</p>` : ''}
    </section>`;
  };
  return `<div class="report">${sides.map(col).join('')}</div>`;
}
function finishBattle() {
  if (B.done) return;
  B.done = true;
  B.playing = false;
  const r = B.sim.result;
  const outcome = r === 'A' ? 'win' : r === 'B' ? 'loss' : 'draw';
  const title = { win: 'Victory', loss: 'Defeat', draw: 'Draw' }[outcome];
  if (B.ex) {
    const sub = { win: `You beat ${B.ghost.name}'s Hall of Fame set.`, loss: `${B.ghost.name}'s Hall of Fame set won this one.`, draw: 'Nobody survived the fight.' }[outcome];
    logLine(`<b>${title}</b> after ${B.sim.duration.toFixed(1)}s.`);
    const res = $('result');
    res.innerHTML = `<div class="result-card"><span class="result-title ${outcome}">${title}</span><span class="result-sub">${sub}</span><span class="result-sub">Exhibitions are just for fun: no gold, lives or wins change.</span>${reportHTML()}<button type="button" class="btn primary" id="continue">Back to the Hall of Fame</button></div>`;
    res.hidden = false;
    $('continue').addEventListener('click', () => endExhibition(outcome));
    $('continue').focus({ preventScroll: true });
    return;
  }
  const sub = {
    win: `You beat the ${B.ghost.name}. +1 win.`,
    loss: `The ${B.ghost.name} beat you. You lose a life.`,
    draw: 'Nobody survived the fight. No change to wins or lives.',
  }[outcome];
  const runEnds = (outcome === 'win' && S.wins + 1 >= S.goal) || (outcome === 'loss' && S.lives - 1 <= 0);
  logLine(`<b>${title}</b> after ${B.sim.duration.toFixed(1)}s.`);
  const res = $('result');
  res.innerHTML = `<div class="result-card"><span class="result-title ${outcome}">${title}</span><span class="result-sub">${sub}</span><span class="result-sub">The fight lasted ${B.sim.duration.toFixed(1)}s.</span>${reportHTML()}<button type="button" class="btn primary" id="continue">${runEnds ? 'See run results' : `Continue to Day ${S.day + 1}`}</button></div>`;
  res.hidden = false;
  $('continue').addEventListener('click', () => continueRun(outcome));
  $('continue').focus({ preventScroll: true });
}
function continueRun(outcome) {
  if (outcome === 'win') S.wins++;
  if (outcome === 'loss') S.lives--;
  S.record.push(outcome);
  hideStatusTip();
  screenEl.classList.remove('in-battle');
  $('phase').textContent = 'The Market';
  $('fight').disabled = false;
  $('fight').textContent = 'Fight';
  clearArena();
  if (S.wins >= S.goal || S.lives <= 0) return showRunOver();
  S.day++;
  S.gold += 10;
  refreshShop();
  S.sel = null;
  render();
  sizeHero();
  toast(`Day ${S.day}: +10 gold and a new market.`);
}
let keepPick = null;
function runItems() { return [...ALL_SLOTS.map(k => S.equip[k]), ...S.bag].filter(Boolean); }
function showRunOver() {
  const won = S.wins >= S.goal;
  const m = $('runover');
  const rec = S.record.map(r => `<i class="${r[0]}" title="${r}"></i>`).join('');
  const items = won ? runItems() : [];
  keepPick = null;
  const keep = items.length ? `<span class="result-sub">Choose one item to keep in your Hall of Fame. It keeps its scroll steps and potential.</span>
    <div class="keep-grid">${items.map(it => `<div class="slot">${hofBtn(it, 'keep')}</div>`).join('')}</div>
    <span class="keep-name" id="keep-name">Pick an item.</span>
    <div class="en-foot centered"><button type="button" class="btn primary" id="keep-btn" aria-disabled="true">Keep in Hall of Fame</button><button type="button" class="btn" id="keep-skip">Skip</button></div>` : '';
  m.innerHTML = `<div class="result-card runover-card" role="dialog" aria-modal="true" aria-labelledby="ro-title">
    <span class="result-title ${won ? 'win' : 'loss'}" id="ro-title">${won ? 'Run complete' : 'Out of lives'}</span>
    <span class="result-sub">${won ? `You reached ${S.goal} wins on Day ${S.day}.` : `Your run ended on Day ${S.day} with ${S.wins} win${S.wins === 1 ? '' : 's'}.`}</span>
    <div class="record" aria-label="Fight record">${rec}</div>
    ${keep || '<div class="en-foot centered" id="ro-end"><button type="button" class="btn primary" id="newrun">Start a new run</button></div>'}</div>`;
  m.hidden = false;
  m.querySelector('.btn.primary')?.focus();
}
function runOverDone(kept) {
  const card = $('runover').querySelector('.result-card');
  card.querySelector('.keep-grid')?.remove();
  card.querySelectorAll('.keep-name, .en-foot').forEach(el => el.remove());
  card.querySelectorAll('.result-sub')[1]?.remove();
  card.insertAdjacentHTML('beforeend', `${kept ? `<span class="result-sub">Kept <b class="r-${ITEMS[kept.id].rarity}">${ITEMS[kept.id].name}</b> in your Hall of Fame.</span>` : ''}
    <div class="en-foot centered"><button type="button" class="btn primary" id="newrun">Start a new run</button>${kept ? '<button type="button" class="btn" id="ro-hof">Visit the Hall of Fame</button>' : ''}</div>`);
  $('newrun').focus();
}
$('runover').addEventListener('click', e => {
  const m = $('runover');
  const pick = e.target.closest('[data-keep]');
  if (pick) {
    keepPick = pick.dataset.keep;
    m.querySelectorAll('[data-keep]').forEach(b => b.classList.toggle('picked', b === pick));
    const it = runItems().find(i => String(i.uid) === keepPick);
    $('keep-name').innerHTML = `<b class="r-${ITEMS[it.id].rarity}">${ITEMS[it.id].name}</b>${steps(it) ? ` ${signed(steps(it))}` : ''}${it.pot ? ` · ${TIERS[it.pot.tier]} potential` : ''}`;
    $('keep-btn').removeAttribute('aria-disabled');
    return;
  }
  if (e.target.closest('#keep-btn')) {
    const it = runItems().find(i => String(i.uid) === keepPick);
    if (!it) return toast('Pick an item to keep first.');
    runOverDone(keepInHof(it, { date: new Date().toISOString().slice(0, 10), day: S.day, name: playerName() }));
    return;
  }
  if (e.target.closest('#keep-skip')) return runOverDone(null);
  if (e.target.closest('#newrun')) { m.hidden = true; hideTip(); newRun(); return; }
  if (e.target.closest('#ro-hof')) { m.hidden = true; hideTip(); newRun(); S.started = false; showMenu('hof'); }
});
function newRun() {
  Object.assign(S, { day: 1, gold: 10, lives: 5, wins: 0, equip: emptyEquip(), bag: Array(6).fill(null), shop: [], sel: null, record: [], ench: [], use: Array(6).fill(null), shards: 0 });
  refreshShop();
  commit();
  sizeHero();
}

$('fight').addEventListener('click', () => startBattle());
$('skip').addEventListener('click', () => {
  if (!B.sim || B.done) return;
  const evs = B.sim.events;
  while (B.ei < evs.length) playEvent(evs[B.ei++], true);
  B.T = B.sim.duration;
  B.ai = evs.length;
  bolts.clear();
  for (const k of ['A', 'B']) { F[k].attack = null; F[k].cast = null; F[k].holder.position.x = F[k].x; }
  B.playing = false;
  endPoses();
  updateHud(true);
  finishBattle();
});
function syncSpeed() { $('speed-seg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === B.speed))); }
$('speed-seg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  B.speed = +b.dataset.v;
  syncSpeed();
});

const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const easeIn = k => Math.pow(Math.min(1, Math.max(0, k)), 2);
const handPos = f => new THREE.Vector3(f.holder.position.x + f.dir * 0.3, 0.85, 0.3);
const chestPos = f => new THREE.Vector3(f.holder.position.x - f.dir * 0.1, 1.05, 0.15);
function lookAhead() {
  const evs = B.sim.events;
  while (B.ai < evs.length && evs[B.ai].t - LEAD <= B.T) {
    const e = evs[B.ai++];
    if (e.type === 'attack') F[e.side].attack = { at: e.t, main: e.main, style: weaponStyle(F[e.side].equip, e.main), color: weaponColor(F[e.side].equip, e.main) };
    else if (e.type === 'trigger' && e.cast) F[e.side].cast = { at: e.t };
    else if (e.type === 'status' && e.cause === 'item' && e.by && e.by !== e.side) {
      bolts.launch(handPos(F[e.by]), chestPos(F[e.side]), e.t - LEAD, e.t, ST_COLOR[e.st][0]);
    }
  }
}
function endPoses() {
  const r = B.sim.result;
  for (const k of ['A', 'B']) {
    const lost = r === 'draw' || (r === 'A' && k === 'B') || (r === 'B' && k === 'A');
    F[k].dead = lost;
    F[k].win = !lost;
  }
  B.shake = 0.6;
}
function stepBattle(dt) {
  if (!B.playing) return 0;
  if (B.hitStop > 0) { B.hitStop -= dt; return 0; }
  const simDt = dt * B.speed;
  B.T += simDt;
  if (B.T > -0.35 && !B.banner) {
    B.banner = true;
    const el = document.createElement('span');
    el.className = 'float banner big';
    el.textContent = 'Fight!';
    el.style.color = '#f4c652';
    el.style.left = '50%';
    el.style.top = '38%';
    $('floats').append(el);
    setTimeout(() => el.remove(), 1150);
  }
  lookAhead();
  const evs = B.sim.events;
  while (B.ei < evs.length && evs[B.ei].t <= B.T) playEvent(evs[B.ei++], false);
  if (B.T >= B.sim.duration) {
    B.T = B.sim.duration;
    updateHud(true);
    if (B.ei >= evs.length) {
      B.playing = false;
      endPoses();
      setTimeout(finishBattle, 1100);
    }
  } else {
    updateHud(false);
  }
  return simDt;
}

// Weapon swing over time. p is seconds relative to the moment the hit lands.
const SWING = {
  '1h': { W: -2.0, H: 0.45, reach: 0.95 },
  '2h': { W: -1.15, H: 0.95, reach: 0.75 },
  fist: { W: 0.55, H: -1.25, reach: 1.05 },
  dual: { W: -1.7, H: 0.4, reach: 0.7 },
};
function attackCurve(p, style) {
  const c = SWING[style];
  if (p < -LEAD || p > REC) return null;
  if (p < -0.07) { const k = ease((p + LEAD) / (LEAD - 0.07)); return { s: c.W * k, dash: -0.12 * k, lean: -0.14 * k }; }
  if (p < 0.03) { const k = easeIn((p + 0.07) / 0.1); return { s: c.W + (c.H - c.W) * k, dash: -0.12 + (c.reach + 0.12) * k, lean: -0.14 + 0.42 * k }; }
  const k = ease((p - 0.03) / (REC - 0.03));
  return { s: c.H * (1 - k), dash: c.reach * (1 - k), lean: 0.28 * (1 - k) };
}
function emitStatus(f, s, dt) {
  const x = f.holder.position.x;
  const R = Math.random;
  const st = s.st;
  // Burn builds from a few embers into licking flames and a little smoke as stacks climb (k: 0 → 1 at 15 stacks).
  const kb = Math.min(1, st.burn / 15);
  const rates = {
    burn: st.burn > 0 ? 3 + kb * 34 : 0,
    smoke: kb > 0.65 ? (kb - 0.65) * 6 : 0,
    poison: st.poison > 0 ? Math.min(7, 1.2 + st.poison * 0.35) : 0,
    drip: st.poison >= 6 ? Math.min(3, st.poison * 0.12) : 0,
    frost: st.frost > 0 && !s.frozen ? 2 + st.frost * 0.8 : 0,
    sand: st.sand > 0 ? Math.min(22, 3 + st.sand * 1.2) : 0,
    heat: s.heat > 0 ? Math.min(10, s.heat * 0.5) : 0,
    luck: s.luck > 0 ? Math.min(8, 1 + s.luck * 0.4) : 0,
    snail: st.slow > 0 ? Math.min(1.1, 0.3 + st.slow * 0.04) : 0,
  };
  for (const k of Object.keys(rates)) {
    f.emit[k] = (f.emit[k] ?? 0) + rates[k] * dt;
    while (f.emit[k] >= 1) {
      f.emit[k] -= 1;
      if (k === 'burn') {
        // Below a few stacks: sparse embers. As stacks climb, glowing flame tongues lick up the body from the feet.
        const flame = R() < 0.25 + kb * 0.75;
        const hot = R();
        if (flame) {
          flames.emit({
            x: x + (R() - 0.5) * (0.5 + kb * 0.3), y: 0.15 + R() * (0.45 + kb * 1.1), z: 0.25 + R() * 0.2,
            vx: (R() - 0.5) * 0.15, vy: 0.5 + R() * 0.4 + kb * 0.5, drag: 0.8, life: 0.35 + R() * 0.25 + kb * 0.2,
            size: 0.035 + R() * 0.03 + kb * 0.035, grow: true,
            color: hot < 0.4 ? 0xffb347 : hot < 0.8 ? 0xff7a2a : 0xe8452a,
          });
        } else {
          particles.emit({
            x: x + (R() - 0.5) * 0.55, y: 0.5 + R() * 1.0, z: 0.25 + R() * 0.2, vx: (R() - 0.5) * 0.2, vy: 0.7 + R() * 0.5,
            life: 0.45 + R() * 0.3, size: 0.016 + R() * 0.012, drag: 0.6, color: hot < 0.5 ? 0xffd86a : 0xff8a2a,
          });
        }
      }
      if (k === 'smoke') particles.emit({ x: x + (R() - 0.5) * 0.35, y: 1.7 + R() * 0.4, z: 0.1, vx: (R() - 0.5) * 0.12, vy: 0.35, life: 1.1, size: 0.035 + R() * 0.025, color: 0x6a6262, grow: true });
      if (k === 'poison') bubbles.emit({ x: x + (R() - 0.5) * 0.65, y: 0.3 + R() * 1.1, z: 0.35, vx: 0, vy: 0.2 + R() * 0.2, wob: 0.16, drag: 0, life: 1.4 + R() * 0.8, size: 0.04 + R() * 0.035, color: R() < 0.6 ? 0x9be070 : 0x6fbf4a, grow: true });
      if (k === 'drip') particles.emit({ x: x + (R() - 0.5) * 0.4, y: 0.7 + R() * 0.5, z: 0.32, vy: -0.4, g: -2, drag: 0, life: 0.6, size: 0.022, color: 0x7fc94a });
      if (k === 'frost') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 1.9 + R() * 0.3, z: (R() - 0.5) * 0.6, vx: (R() - 0.5) * 0.2, vy: -0.45 - R() * 0.2, life: 1.2, size: 0.03, color: 0xdff6ff, grow: true });
      if (k === 'sand') particles.emit({ x, y: 1.25 + R() * 0.5, vy: (R() - 0.5) * 0.3, life: 0.7 + R() * 0.4, size: 0.025 + R() * 0.02, color: R() < 0.5 ? 0xdbb470 : 0xc9a060, orbit: { cx: x, r: 0.42 + R() * 0.2, a: R() * Math.PI * 2, w: 4 + R() * 2 } });
      if (k === 'heat') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 0.05, z: (R() - 0.5) * 0.6, vy: 0.8 + R() * 0.6, life: 0.6, size: 0.03, color: 0xffb04a });
      if (k === 'luck') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 0.4 + R() * 1.4, z: (R() - 0.5) * 0.5, vy: 0.15, life: 0.6, size: 0.05, color: 0xf4c652, grow: true });
      if (k === 'snail') spawnSnail(f);
    }
  }
}
function animateFighters(t, dt, simDt) {
  const fr = B.sim ? B.sim.frames[Math.max(0, B.fi)] : null;
  if (B.shake > 0) B.shake = Math.max(0, B.shake - dt * 3);
  const sh = B.shake * B.shake * 0.09;
  ac.position.set(camBase.x + Math.sin(t * 0.35) * 0.12 + (Math.random() - 0.5) * sh, camBase.y + (Math.random() - 0.5) * sh, camBase.z);
  ac.lookAt(0, 1.0, 0);
  const animDt = B.playing ? simDt : dt;
  for (const side of ['A', 'B']) {
    const f = F[side];
    if (!f) continue;
    const hero = f.hero;
    animateHero(hero, t + (side === 'B' ? 1.3 : 0), dt, reduceMotion);
    let s = 0, os = 0, dash = 0, lean = 0;
    if (f.attack) {
      const c = attackCurve(B.T - f.attack.at, f.attack.style);
      if (c) {
        if (f.attack.main) s = c.s; else os = c.s;
        dash = c.dash;
        lean = c.lean;
        const p = B.T - f.attack.at;
        const k = p > -0.08 && p < 0.16 ? 1 - Math.abs(p - 0.02) / 0.14 : 0;
        f.fx.slashMat.opacity = Math.max(0, k) * 0.85;
        f.fx.slashMat.color.set(f.attack.color);
        const big = f.attack.style === '2h' ? 1.25 : 1;
        f.fx.slash.scale.set(f.dir * big, big, 1);
        f.fx.slash2.scale.set(f.dir * big, big, 1);
      } else if (B.T > f.attack.at + REC) { f.attack = null; f.fx.slashMat.opacity = 0; }
    } else f.fx.slashMat.opacity = 0;
    if (f.cast) {
      const p = B.T - f.cast.at;
      if (p > -0.22 && p < 0) os += -1.6 * ease((p + 0.22) / 0.22);
      else if (p >= 0 && p < 0.35) { os += -1.6 * (1 - ease(p / 0.35)); if (p < 0.05) particles.burst(handPos(f).x, 0.95, 0.3, 1, 0xf4c652, { max: 0.5, life: 0.3, g: 0 }); }
      else if (p >= 0.35) f.cast = null;
    }
    // Intro: run in from off-stage.
    let introX = 0, hop = 0;
    if (B.T < 0 && B.playing) {
      const k = ease((B.T + INTRO) / 0.65);
      introX = -f.dir * 2.2 * (1 - k);
      if (k < 1) hop = Math.abs(Math.sin(t * 16)) * 0.08;
    }
    // Hit reaction and dodge.
    f.knock = Math.max(0, f.knock - animDt * 4);
    f.dodge = Math.max(0, f.dodge - animDt * 3.2);
    const knock = Math.min(1.4, f.knock);
    const kx = -f.dir * 0.3 * knock * knock;
    lean -= 0.35 * Math.min(1, knock);
    const dodgeK = f.dodge > 0 ? Math.sin((1 - f.dodge) * Math.PI) : 0;
    // End of fight.
    if (f.dead) {
      f.deathT += dt;
      const k = ease(f.deathT / 0.55);
      hero.root.rotation.x = -1.35 * k;
      hero.root.position.y = -0.08 * k;
      if (f.deathT - dt < 0.5 && f.deathT >= 0.5) particles.burst(f.holder.position.x - f.dir * 0.6, 0.1, 0, 20, [0x8a7a60, 0x5a4a3a], { max: 1.8, up: 0.8, life: 0.6, size: 0.05 });
      s = 0; os = 0;
    } else {
      hero.root.rotation.x = 0;
      hero.root.position.y = 0;
    }
    if (f.win) {
      f.winT += dt;
      const k = ease(f.winT / 0.3);
      s = SWING[weaponStyle(f.equip, true)].W * 0.85 * k;
      hop = f.winT > 0.3 && f.winT < 2.3 ? Math.abs(Math.sin((f.winT - 0.3) * 7)) * 0.22 : 0;
      if (Math.random() < dt * 10 && f.winT < 2.5) particles.emit({ x: f.holder.position.x + (Math.random() - 0.5) * 1.2, y: 0.3 + Math.random() * 1.8, z: (Math.random() - 0.5) * 0.5, vy: 0.3, life: 0.7, size: 0.06, color: 0xf4c652, grow: true });
    }
    swingPose(hero, s, os);
    hero.body.rotation.x = reduceMotion ? 0 : lean;
    hero.body.rotation.z = reduceMotion ? 0 : -f.dir * 0.22 * dodgeK;
    const motion = reduceMotion ? 0 : 1;
    f.holder.position.set(f.x + (introX + f.dir * dash + kx) * motion, hop * motion, 0.45 * dodgeK * motion);
    // Hit flash and frozen tint.
    const s0 = fr ? fr[side] : null;
    f.flash = Math.max(0, f.flash - dt * 4);
    const frozen = !!(s0 && s0.frozen);
    const fk = Math.max(f.flash, frozen ? 0.35 : 0);
    if (fk > 0.01) {
      const col = f.flash > 0.35 || !frozen ? f.flashColor : ICE;
      for (const mt of f.mats) { mt.emissive.copy(mt.userData.em0).lerp(col, fk); mt.emissiveIntensity = Math.max(mt.userData.ei0, fk * 1.1); }
      f.flashOn = true;
    } else if (f.flashOn) {
      for (const mt of f.mats) { mt.emissive.copy(mt.userData.em0); mt.emissiveIntensity = mt.userData.ei0; }
      f.flashOn = false;
    }
    // Ice block grows in and shrinks out.
    f.iceK += ((frozen ? 1 : 0) - f.iceK) * Math.min(1, dt * 12);
    f.ice.visible = f.iceK > 0.02;
    f.ice.scale.setScalar(0.6 + 0.4 * f.iceK);
    // Shield bubble, status rings.
    f.pulse = Math.max(0, f.pulse - dt * 2.5);
    const shieldK = s0 && s0.shield > 0.5 ? Math.min(1, 0.35 + s0.shield / (s0.maxHp * 0.4)) : 0;
    f.fx.bubbleMat.opacity = shieldK * 0.13 + f.pulse * 0.25;
    f.fx.wireMat.opacity = shieldK * 0.22 + f.pulse * 0.35;
    f.fx.bubble.rotation.y += dt * 0.4;
    f.fx.wire.rotation.y = f.fx.bubble.rotation.y;
    const pulseScale = 1 + f.pulse * 0.08;
    f.fx.bubble.scale.set(0.82 * pulseScale, 1.12 * pulseScale, 0.82 * pulseScale);
    f.fx.wire.scale.copy(f.fx.bubble.scale);
    const slow = s0 ? s0.st.slow : 0, heat = s0 ? s0.heat : 0;
    f.fx.slowRing.material.opacity = slow > 0 ? Math.min(0.8, 0.25 + slow * 0.05) : 0;
    f.fx.slowRing.rotation.z += dt * 0.8;
    f.fx.slowRing.scale.setScalar(0.85 + Math.sin(t * 2) * 0.04);
    f.fx.heatRing.material.opacity = heat > 0 ? Math.min(0.8, 0.2 + heat * 0.04) : 0;
    f.fx.heatRing.scale.setScalar(0.7 + Math.sin(t * 5) * 0.05);
    f.clutch = Math.max(0, f.clutch - dt * 1.5);
    f.fx.clutchRing.material.opacity = f.clutch * 0.9;
    f.fx.clutchRing.scale.setScalar(0.6 + (1 - f.clutch) * 1.4);
    if (s0 && B.playing && B.T > 0 && !reduceMotion) emitStatus(f, s0, simDt);
  }
  bolts.update(B.T, simDt);
  particles.update(animDt);
  bubbles.update(animDt);
  flames.update(animDt);
  for (const key of Object.keys(B.flash)) {
    B.flash[key] -= dt;
    if (B.flash[key] <= 0) {
      const [side, slot] = key.split(':');
      $(`hud-${side}`).querySelector(`.hi[data-slot="${slot}"]`)?.classList.remove('flash');
      delete B.flash[key];
    }
  }
}
const ICE = new THREE.Color(0x7fd6ff);

// Rebuild the characters with the materials for the chosen art style.
function restyleHeroes() {
  const m = matFor(S.ttStyle);
  hs.remove(hero.root);
  const yaw = hero.root.rotation.y;
  hero = buildHero(lookOf(P), m);
  hero.root.rotation.y = yaw;
  hs.add(hero.root);
  dressHero(hero, S.equip, ITEMS);
  for (const k of ['A', 'B']) {
    const f = F[k];
    if (!f) continue;
    if (f.flashOn) for (const mt of f.mats) { mt.emissive.copy(mt.userData.em0); mt.emissiveIntensity = mt.userData.ei0; }
    f.holder.remove(f.hero.root);
    const h = buildHero(f.look, m);
    dressHero(h, f.equip, ITEMS);
    h.root.rotation.y = f.dir * 0.8;
    f.holder.add(h.root);
    f.hero = h;
    f.mats = collectMats(h.root);
    f.flashOn = false;
  }
  buildMenuHero();
}

/* =========================================================
   Main menu: customise your look and backdrop, then play
   ========================================================= */
const menuStage = $('menu-stage');
const menuCanvas = $('menu-hero');
const mr = new THREE.WebGLRenderer({ canvas: menuCanvas, antialias: true, alpha: true });
mr.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
mr.setClearColor(0x000000, 0);
const mscene = new THREE.Scene();
heroLights(mscene);
mscene.add(pedestal());
const mcam = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
const mpx = new PixelPass(mr);
let menuHero = null;
let menuYaw = 0.38, menuDrag = null;
const onMenu = () => document.body.classList.contains('on-menu');
function buildMenuHero() {
  const yaw = menuHero ? menuHero.root.rotation.y : menuYaw;
  if (menuHero) mscene.remove(menuHero.root);
  menuHero = buildHero(lookOf(P), matFor(S.ttStyle));
  // On the Hall of Fame tab you wear your exhibition set; otherwise your current run's gear.
  dressHero(menuHero, menuTab === 'hof' ? hofEquip() : S.equip, ITEMS);
  menuHero.root.rotation.y = yaw;
  mscene.add(menuHero.root);
}
function sizeMenu() {
  const w = menuStage.clientWidth, h = menuStage.clientHeight;
  if (!w || !h) return;
  mr.setSize(w, h, false);
  mpx.setSize(w, h);
  mcam.aspect = w / h;
  const tanH = Math.tan(THREE.MathUtils.degToRad(mcam.fov / 2));
  const d = Math.max(1.55 / tanH, 1.0 / (tanH * mcam.aspect));
  mcam.position.set(0, 1.2 + d * 0.06, d);
  mcam.lookAt(0, 1.08, 0);
  mcam.updateProjectionMatrix();
}
new ResizeObserver(sizeMenu).observe(menuStage);
menuCanvas.addEventListener('pointerdown', e => { menuDrag = e.clientX; menuCanvas.setPointerCapture(e.pointerId); });
menuCanvas.addEventListener('pointermove', e => { if (menuDrag === null) return; menuYaw += (e.clientX - menuDrag) * 0.012; menuDrag = e.clientX; });
for (const ev of ['pointerup', 'pointercancel']) menuCanvas.addEventListener(ev, () => { menuDrag = null; });

const hex = n => `#${n.toString(16).padStart(6, '0')}`;
function renderMenu() {
  for (const k of Object.keys(LOOKS)) {
    $(`sw-${k}`).innerHTML = LOOKS[k].map((c, i) => `<button type="button" class="sw${P[k] === c ? ' on' : ''}" data-look="${k}" data-v="${c}" style="--c:${hex(c)}" aria-pressed="${P[k] === c}" aria-label="${LOOK_NAME[k]} ${i + 1}"></button>`).join('');
  }
  $('sw-hairStyle').innerHTML = HAIR_STYLES.map(([id, label]) => `<button type="button" class="chipbtn${P.hairStyle === id ? ' on' : ''}" data-look="hairStyle" data-v="${id}" aria-pressed="${P.hairStyle === id}">${label}</button>`).join('');
  $('backdrops').innerHTML = BACKDROPS.map(([id, label]) => `<button type="button" class="bdcard${P.backdrop === id ? ' on' : ''}" data-look="backdrop" data-v="${id}" aria-pressed="${P.backdrop === id}"><span class="bd bd-${id}" aria-hidden="true"></span><span>${label}</span></button>`).join('');
  if (document.activeElement !== $('pname')) $('pname').value = P.name;
  $('nameplate').textContent = playerName();
  $('play').textContent = S.started ? 'Continue run' : 'Play';
  $('menu-newrun').hidden = !S.started;
  $('hof-count').textContent = HOF.items.length || '';
  $('menu-run').textContent = S.started ? `Day ${S.day} · ${S.wins} win${S.wins === 1 ? '' : 's'} · ${S.lives} li${S.lives === 1 ? 'fe' : 'ves'} left` : 'Reach 10 wins before you run out of lives.';
  setBackdrop(menuStage, P.backdrop);
}
function applyLook() {
  saveProfile();
  setBackdrop($('stage'), P.backdrop);
  restyleHeroes();
  renderMenu();
}
function showMenu(tab = menuTab) {
  if (screenEl.classList.contains('in-battle')) return;
  closeSheet();
  hideTip();
  document.body.classList.add('on-menu');
  setTab(tab);
  renderMenu();
  sizeMenu();
  $('play').focus({ preventScroll: true });
}
function hideMenu() {
  document.body.classList.remove('on-menu');
  S.started = true;
  render();
  sizeHero();
}
$('menu').addEventListener('click', e => {
  const b = e.target.closest('[data-look]');
  if (b) {
    const k = b.dataset.look;
    P[k] = k === 'hairStyle' || k === 'backdrop' ? b.dataset.v : +b.dataset.v;
    applyLook();
    return;
  }
  const tab = e.target.closest('[data-tab]');
  if (tab) return setTab(tab.dataset.tab);
  const h = e.target.closest('[data-hof]');
  if (h) return toggleLoadout(h.dataset.hof);
  if (e.target.closest('#ex-fight')) return startExhibition();
  if (e.target.closest('#ex-next')) { rival = makeRival(); return renderHof(); }
  if (e.target.closest('#dev-hof')) return devHofItem();
  if (e.target.closest('#dev-wins')) {
    S.wins = Math.max(S.wins, S.goal - 1);
    S.started = true;
    renderMenu();
    render();
    return toast(`Wins set to ${S.wins}. Win the next fight to finish the run.`);
  }
  if (e.target.closest('#play')) hideMenu();
  else if (e.target.closest('#menu-newrun')) { newRun(); hideMenu(); }
  else if (e.target.closest('#randomise')) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    for (const k of Object.keys(LOOKS)) P[k] = pick(LOOKS[k]);
    P.hairStyle = pick(HAIR_STYLES)[0];
    P.backdrop = pick(BACKDROPS)[0];
    applyLook();
  }
});
$('pname').addEventListener('input', e => {
  P.name = e.target.value.slice(0, 16);
  saveProfile();
  $('nameplate').textContent = playerName();
});
$('menu-btn').addEventListener('click', () => showMenu());

/* =========================================================
   Hall of Fame: keep one item per won run, build an exhibition set, fight other players' sets
   ========================================================= */
const HOF_KEY = 'hallOfFame';
function loadHof() {
  try {
    const h = JSON.parse(localStorage.getItem(HOF_KEY) || 'null');
    if (h && Array.isArray(h.items)) {
      // Drop items removed from the catalog, and any loadout slots that pointed at them.
      h.items = h.items.filter(it => it && ITEMS[it.id]);
      for (const k of Object.keys(h.loadout || {})) {
        if (!h.items.some(it => it.uid === h.loadout[k])) delete h.loadout[k];
      }
      return { loadout: {}, record: { w: 0, l: 0, d: 0 }, ...h };
    }
  } catch { /* storage unavailable or corrupt */ }
  return { items: [], loadout: {}, record: { w: 0, l: 0, d: 0 } };
}
const HOF = loadHof();
const saveHof = () => { try { localStorage.setItem(HOF_KEY, JSON.stringify(HOF)); } catch { /* storage unavailable */ } };
const hofItem = uid => HOF.items.find(i => i.uid === uid) ?? null;
const clone = o => (o ? JSON.parse(JSON.stringify(o)) : undefined);
// Upgrades are copied as steps and lines, so kept items follow future balance changes.
function keepInHof(item, meta) {
  const kept = { uid: `h${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, id: item.id, up: clone(item.up), pot: clone(item.pot), kept: meta };
  HOF.items.unshift(kept);
  rival = null;
  saveHof();
  return kept;
}
const hofEquip = () => Object.fromEntries(ALL_SLOTS.map(k => [k, HOF.loadout[k] ? hofItem(HOF.loadout[k]) : null]));
const loadoutCount = () => ALL_SLOTS.filter(k => HOF.loadout[k] && hofItem(HOF.loadout[k])).length;
function toggleLoadout(uid) {
  const item = hofItem(uid);
  if (!item) return;
  const at = ALL_SLOTS.find(k => HOF.loadout[k] === uid);
  if (at) {
    delete HOF.loadout[at];
  } else {
    const def = ITEMS[item.id];
    const slot = def.slot === 'ring' ? (!HOF.loadout.ring1 ? 'ring1' : !HOF.loadout.ring2 ? 'ring2' : 'ring1') : def.slot;
    if (slot === 'weapon' && def.weapon?.hands === 2) delete HOF.loadout.offhand;
    if (slot === 'offhand') { const w = hofItem(HOF.loadout.weapon); if (w && ITEMS[w.id].weapon?.hands === 2) delete HOF.loadout.weapon; }
    HOF.loadout[slot] = uid;
  }
  hideTip();
  saveHof();
  renderHof();
  buildMenuHero();
}

// Other players' Hall of Fame avatars. There's no server yet, so these are generated: late-run builds with
// upgrades, trimmed to the same number of items as your set so the fight stays fair.
const RIVAL_NAMES = ['Kestrel', 'Mossbrook', 'Ivy', 'Tallow', 'Quill', 'Juniper', 'Brannoc', 'Saffi', 'Oro', 'Wren', 'Hollis', 'Marigold', 'Thane', 'Pip', 'Cobalt', 'Rue'];
let rival = null;
function makeRival() {
  const n = Math.max(1, loadoutCount());
  const day = 10 + Math.floor(rng() * 6);
  const g = makeGhost(day, rng);
  upgradeGhost(g, day, rng);
  const have = ALL_SLOTS.filter(k => g.equip[k]);
  const keep = [...have.filter(k => k === 'weapon'), ...have.filter(k => k !== 'weapon').sort(() => rng() - 0.5)].slice(0, n);
  const pick = a => a[Math.floor(rng() * a.length)];
  return {
    n, name: pick(RIVAL_NAMES), schools: g.schools, backdrop: pick(BACKDROPS)[0],
    equip: Object.fromEntries(ALL_SLOTS.map(k => [k, keep.includes(k) ? g.equip[k] : null])),
    look: { skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), eyes: pick(LOOKS.eyes), tunic: pick(LOOKS.tunic), hairStyle: pick(HAIR_STYLES)[0] },
  };
}
function hofBtn(item, mode = 'hof') {
  const def = ITEMS[item.id];
  return `<button type="button" class="hitem r-${def.rarity}" data-${mode}="${item.uid}" aria-label="${def.name}"><img src="${iconFor(item.id)}" alt="" draggable="false">${kwBadges(def)}${badges(item)}</button>`;
}
const HOF_ORDER = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
function renderHof() {
  const el = $('tab-hof');
  $('hof-count').textContent = HOF.items.length || '';
  const r = HOF.record;
  const head = `<div class="ph"><h2>Hall of Fame</h2><span class="rule"></span><span class="aside">${r.w + r.l + r.d ? `Exhibitions ${r.w}W · ${r.l}L${r.d ? ` · ${r.d}D` : ''}` : `${HOF.items.length} kept`}</span></div>`;
  if (!HOF.items.length) {
    el.innerHTML = `${head}<div class="hof-empty"><p><b>Win a run</b> (${S.goal} wins) to keep one item you finished with. It keeps its scroll steps and potential lines.</p><p>Then build an <b>exhibition set</b> from your kept items and fight other players' Hall of Fame avatars, just for fun. Hall of Fame items never enter runs.</p></div>`;
    return;
  }
  if (!rival || rival.n !== Math.max(1, loadoutCount())) rival = makeRival();
  const eq = hofEquip();
  const inSet = new Set(Object.values(HOF.loadout));
  const ri = HOF_ORDER.filter(k => rival.equip[k]).map(k => `<span class="ri r-${ITEMS[rival.equip[k].id].rarity}" data-rival="${k}"><img src="${iconFor(rival.equip[k].id)}" alt="${ITEMS[rival.equip[k].id].name}"></span>`).join('');
  el.innerHTML = `${head}
    <div class="hof-top">
      <div class="hof-set-wrap"><span class="opt-cap">Exhibition set · ${loadoutCount()} / 10</span>
        <div class="hof-set">${HOF_ORDER.map(k => `<div class="slot" title="${SLOT_NAME[k]}">${eq[k] ? hofBtn(eq[k]) : glyph(k)}</div>`).join('')}</div>
      </div>
      <div class="rival">
        <span class="bd bd-${rival.backdrop} rival-bd" aria-hidden="true"></span>
        <span class="opt-cap">Next opponent</span>
        <b class="rival-name">${rival.name}</b>
        <span class="rival-sub">${rival.schools.join(' · ')} · ${rival.n}-item set</span>
        <div class="rival-items">${ri}</div>
        <div class="rival-btns"><button type="button" class="fight" id="ex-fight"${loadoutCount() ? '' : ' disabled title="Add items to your exhibition set first"'}>Fight</button><button type="button" class="btn mini-plain" id="ex-next">Find another</button></div>
      </div>
    </div>
    <div class="ph sub"><h3>Vault</h3><span class="rule"></span><span class="aside">Click an item to add it to your set or take it out</span></div>
    <div class="hof-vault">${HOF.items.map(i => `<div class="slot${inSet.has(i.uid) ? ' in-set' : ''}">${hofBtn(i)}</div>`).join('')}</div>`;
}
let menuTab = 'look';
function setTab(tab) {
  menuTab = tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('tab-look').hidden = tab !== 'look';
  $('tab-hof').hidden = tab !== 'hof';
  if (tab === 'hof') renderHof();
  buildMenuHero();
  sizeMenu();
}
function startExhibition() {
  if (!rival || !loadoutCount()) return;
  document.body.classList.remove('on-menu');
  hideTip();
  startBattle({ equip: hofEquip(), ghost: { name: rival.name, equip: rival.equip, schools: rival.schools }, look: rival.look, backdrop: rival.backdrop });
}
function endExhibition(outcome) {
  HOF.record[outcome[0]]++;
  saveHof();
  rival = null;
  hideStatusTip();
  screenEl.classList.remove('in-battle', 'ex');
  $('phase').textContent = 'The Market';
  $('fight').disabled = false;
  $('fight').textContent = 'Fight';
  clearArena();
  B.ex = null;
  showMenu('hof');
  toast({ win: 'Exhibition won.', loss: 'Exhibition lost.', draw: 'Exhibition drawn.' }[outcome]);
}
// Dev: a random Rare-or-better item with run-like upgrades, so the Hall of Fame can be tried without winning runs.
function devHofItem() {
  const pool = ITEM_IDS.filter(id => ITEMS[id].rarity !== 'common');
  const item = inst(pool[Math.floor(rng() * pool.length)]);
  upgradeGhost({ equip: { weapon: item } }, 15, rng);
  if (!item.pot && rng() < 0.7) item.pot = rollCube(item, USE.bright_cube, rng).pot;
  keepInHof(item, { date: new Date().toISOString().slice(0, 10), dev: true });
  renderHof();
  renderMenu();
  toast(`Added ${ITEMS[item.id].name} to the Hall of Fame.`);
}
// Tooltips for Hall of Fame items, run-over picks and rival gear.
function hitemData(el) {
  if (el.dataset.hof) return hofItem(el.dataset.hof);
  if (el.dataset.keep) return runItems().find(i => String(i.uid) === el.dataset.keep);
  if (el.dataset.rival) return rival?.equip[el.dataset.rival];
  return null;
}
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('.hitem, .ri');
  const item = el && hitemData(el);
  if (item) showTipFor(el, ITEMS[item.id], item);
});
document.addEventListener('pointerout', e => {
  const el = e.target.closest('.hitem, .ri');
  if (el && !el.contains(e.relatedTarget)) hideTip();
});
function drawMenu(dt) {
  if (!reduceMotion && menuDrag === null) menuYaw += dt * 0.3;
  animateHero(menuHero, t, dt, reduceMotion);
  menuHero.root.rotation.y += (menuYaw - menuHero.root.rotation.y) * 0.18;
  if (S.ttStyle === 'pixel') mpx.render(mscene, mcam); else mr.render(mscene, mcam);
}

/* =========================================================
   Loop
   ========================================================= */
let ttDirty = true, ttYaw = 0, t = 0, last = performance.now();
function drawTurntable() {
  if (!ttItem) { ttCtx.clearRect(0, 0, tt.width, tt.height); return; }
  studio.turntable(ttItem, S.ttStyle, ttYaw, ttCtx, t);
}
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  t += dt;
  if (onMenu()) {
    drawMenu(dt);
  } else if (screenEl.classList.contains('in-battle')) {
    const simDt = stepBattle(dt);
    animateFighters(t, dt, simDt);
    updateOverheads();
    if (S.ttStyle === 'pixel') apx.render(as, ac); else ar.render(as, ac);
  } else {
    if (!reduceMotion) { ttYaw += dt * 0.8; ttDirty = true; }
    if (ttDirty) { drawTurntable(); ttDirty = false; }
    animateHero(hero, t, dt, reduceMotion);
    hero.root.rotation.y += (heroYaw - hero.root.rotation.y) * 0.18;
    if (S.ttStyle === 'pixel') hpx.render(hs, hc); else hr.render(hs, hc);
  }
  requestAnimationFrame(loop);
}

syncTTSeg();
syncSpeed();
refreshShop();
render();
dressHero(hero, S.equip, ITEMS);
setBackdrop($('stage'), P.backdrop);
sizeHero();
if (location.search.includes('play')) S.started = true;
else showMenu();
requestAnimationFrame(loop);

// Test hook, only with ?debug in the URL.
if (location.search.includes('debug')) window.__game = { S, P, HOF, ITEMS, USE, inst, commit, startBattle, B, openEnchant, openForge, showMenu, showRunOver, devHofItem };

// Ambient background: embers rise in Low-poly mode; in Pixel mode the same motes become falling leaves under drifting clouds.
{
  const r = (a, b) => a + Math.random() * (b - a);
  let h = '';
  for (let i = 0; i < 24; i++) h += `<i class="mote" style="--x:${r(0, 100).toFixed(1)}vw;--s:${r(0.6, 1.6).toFixed(2)};--t:${r(16, 30).toFixed(1)}s;--d:-${r(0, 30).toFixed(1)}s;--w:${r(-40, 40).toFixed(0)}px"></i>`;
  for (let i = 0; i < 5; i++) h += `<i class="cloud" style="--y:${r(2, 50).toFixed(1)}vh;--s:${r(0.7, 1.5).toFixed(2)};--t:${r(110, 190).toFixed(0)}s;--d:-${r(0, 190).toFixed(0)}s"></i>`;
  $('bgfx').innerHTML = h;
}
