// Game screens: the market (shop, bag, equipment, inspector) and battles against ghost builds.
import * as THREE from 'three';
import {
  ITEMS, SLOT_NAME, RARITY_NAME, SCHOOL_VAR, slotLabel, statLine, fitsSlot, rollShopId, makeGhost,
} from './items.js';
import { simulate, mulberry32, RULES } from './engine.js';
import { createStudio, buildHero, dressHero, animateHero, swingPose, pedestal, heroLights, iceBlock, MS, mesh, materialFactory, PixelPass } from './models.js';
import { Particles, Bolts, fighterFx } from './fx.js';

const $ = id => document.getElementById(id);
const studio = createStudio(ITEMS);
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
};
const STATUS_VAR = { burn: '--s-fire', poison: '--s-venom', frost: '--s-frost', slow: '--s-frost', sand: '--s-desert', heat: '--s-fire', luck: '--s-fortune', frozen: '--s-frost' };
const STATUS_NAME = { burn: 'Burn', poison: 'Poison', frost: 'Frost', slow: 'Slow', sand: 'Sand', heat: 'Heat', luck: 'Luck', ls: 'Lifesteal' };

/* =========================================================
   State
   ========================================================= */
let uidN = 1;
const inst = id => ({ uid: uidN++, id });
function loadStyle() { try { return localStorage.getItem('artStyle') === 'pixel' ? 'pixel' : 'smooth'; } catch { return 'smooth'; } }
const MP = materialFactory('pixel');
const matFor = style => (style === 'pixel' ? MP : MS);
const emptyEquip = () => Object.fromEntries(ALL_SLOTS.map(k => [k, null]));
const S = {
  day: 1, gold: 10, lives: 5, maxLives: 5, wins: 0, goal: 10,
  equip: emptyEquip(), bag: Array(6).fill(null), shop: [], sel: null, ttStyle: loadStyle(), record: [],
};

const getItem = loc => {
  if (!loc) return null;
  const [w, k] = loc.split(':');
  if (w === 'shop') { const o = S.shop[+k]; return o && !o.sold ? o : null; }
  if (w === 'bag') return S.bag[+k];
  return S.equip[k];
};
const sellValue = id => Math.floor(ITEMS[id].price / 2);
const freeBag = (except = -1) => S.bag.map((v, i) => (v === null && i !== except ? i : -1)).filter(i => i >= 0);
const isTwoHanded = item => !!(item && ITEMS[item.id].weapon?.hands === 2);

function rollOffer(filter) { return { ...inst(rollShopId(S.day, rng, filter)), locked: false, sold: false }; }
function refreshShop() {
  const old = S.shop;
  S.shop = Array.from({ length: 5 }, (_, i) => (old[i] && old[i].locked && !old[i].sold ? old[i] : rollOffer()));
  const hasWeapon = S.equip.weapon || S.bag.some(b => b && ITEMS[b.id].slot === 'weapon') || S.shop.some(o => ITEMS[o.id].slot === 'weapon');
  if (!hasWeapon) {
    const i = S.shop.findIndex(o => !o.locked);
    if (i >= 0) S.shop[i] = rollOffer(d => d.slot === 'weapon' && d.price <= Math.max(3, S.gold));
  }
}

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
  if (w === 'shop') return;
  const v = sellValue(item.id);
  if (w === 'bag') S.bag[+k] = null;
  else S.equip[k] = null;
  S.gold += v;
  bumpGold();
  if (S.sel === loc) S.sel = null;
  toast(`Sold ${ITEMS[item.id].name} for ${v} gold.`);
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
  S.shop = S.shop.map(o => (o.locked && !o.sold ? o : rollOffer()));
  if (S.sel?.startsWith('shop:')) S.sel = null;
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
  if (w === 'shop') return;
  if (w === 'bag') equipFrom(loc);
  else unequip(k);
}
function canDrop(from, target) {
  const item = getItem(from);
  if (!item) return false;
  const [fw, fk] = from.split(':');
  const [tw, tk] = target.split(':');
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
  if (tw === 'sell') return sell(from);
  if (fw === 'shop') return buy(+fk, { where: tw, key: tw === 'bag' ? +tk : tk });
  if (tw === 'equip') return equipFrom(from, tk);
  if (tw === 'bag') return fw === 'bag' ? swapBag(+fk, +tk) : unequip(fk, +tk);
}

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
const offerEls = [];
for (let i = 0; i < 5; i++) {
  const el = document.createElement('div');
  el.className = 'offer';
  $('offers').append(el);
  offerEls.push(el);
}
const glyph = k => `<svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${GLYPH[k]}</svg>`;
const schoolDot = sc => `<span class="dot" style="--sc: var(${SCHOOL_VAR[sc]})"></span>`;
function itemBtn(item, loc, extraLabel = '') {
  const def = ITEMS[item.id];
  const cls = ['item', `r-${def.rarity}`];
  if (S.sel === loc) cls.push('sel');
  if (item.uid === freshUid) cls.push('pop');
  return `<button type="button" class="${cls.join(' ')}" data-loc="${loc}" aria-label="${def.name}${extraLabel}"><img src="${studio.icon(item.id)}" alt="" draggable="false"></button>`;
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
  $('bag-count').textContent = `${S.bag.filter(Boolean).length} / 6`;
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
}
function renderStats() {
  let hp = 100, luck = 0;
  for (const k of ALL_SLOTS) {
    const it = S.equip[k];
    if (!it) continue;
    hp += ITEMS[it.id].hp || 0;
    luck += ITEMS[it.id].stats?.luck || 0;
  }
  const w = S.equip.weapon && ITEMS[S.equip.weapon.id].weapon;
  const tiles = [
    ['HP', hp],
    ['Damage', w ? w.dmg : 1],
    ['Speed', `${(w ? w.interval : 1.5).toFixed(1)}s`],
    ['Crit', `${5 + luck * 3}%`],
  ];
  $('stats').innerHTML = tiles.map(([k, v]) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
}
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
  const def = ITEMS[item.id];
  const [w, k] = loc.split(':');
  const where = w === 'shop' ? 'In the market' : w === 'bag' ? 'In your bag' : `Equipped · ${SLOT_NAME[k]}`;
  const value = w === 'shop' ? `Costs ${def.price} gold` : `Sells for ${sellValue(item.id)} gold`;
  card.innerHTML = `<span class="c-name r-${def.rarity}">${def.name}</span>
    <div class="chips">${def.schools.map(sc => `<span class="chip">${schoolDot(sc)}${sc}</span>`).join('')}<span class="chip">${slotLabel(def)}</span><span class="chip">${RARITY_NAME[def.rarity]}</span></div>
    <span class="c-stats">${statLine(def)}</span>
    <p class="c-effect">${def.text}</p>
    <span class="c-value">${where} · ${value}</span>`;
  const btn = (act, label, primary, extra = '') => `<button type="button" class="btn${primary ? ' primary' : ''}" data-act="${act}" ${extra}>${label}</button>`;
  if (w === 'shop') {
    const o = S.shop[+k];
    actions.innerHTML = btn('buy', `${COIN.replace('<svg', '<svg width="16" height="16"')}Buy for ${def.price}`, true, S.gold < def.price ? 'aria-disabled="true"' : '')
      + btn('lock', o.locked ? 'Unlock' : 'Lock offer', false);
  } else if (w === 'bag') {
    actions.innerHTML = btn('equip', 'Equip', true) + btn('sell', `Sell for ${sellValue(item.id)}`, false);
  } else {
    actions.innerHTML = btn('unequip', 'Take off', true) + btn('sell', `Sell for ${sellValue(item.id)}`, false);
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
function showTipFor(el, def) {
  tip.innerHTML = `<span class="t-name r-${def.rarity}">${def.name}</span>
    <span class="t-meta">${def.schools.join(' · ')} · ${slotLabel(def)} · ${RARITY_NAME[def.rarity]}</span>
    <span>${statLine(def)}</span><span>${def.text}</span>`;
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
  if (b) { const item = getItem(b.dataset.loc); if (item) showTipFor(b, ITEMS[item.id]); return; }
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
  if (el.dataset.id) { showTipFor(el, ITEMS[el.dataset.id]); return; }
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
    g.src = studio.icon(item.id);
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
  if (suppressClick) return;
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
  }
});
$('reroll').addEventListener('click', reroll);
$('sheet-close').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
const tt = $('turntable');
const ttCtx = tt.getContext('2d');
function syncTTSeg() {
  document.querySelectorAll('[data-style-seg] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.ttStyle)));
  for (const el of [tt, $('hero'), $('arena')]) el.classList.toggle('pixel', S.ttStyle === 'pixel');
}
document.querySelectorAll('[data-style-seg]').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.dataset.v === S.ttStyle) return;
  S.ttStyle = b.dataset.v;
  try { localStorage.setItem('artStyle', S.ttStyle); } catch { /* storage unavailable */ }
  syncTTSeg();
  ttDirty = true;
  restyleHeroes();
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
let hero = buildHero({}, matFor(S.ttStyle));
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
{
  const floor = mesh(new THREE.CircleGeometry(4.2, 40), MS(0x2a2119), [0, -0.17, 0], [-Math.PI / 2, 0, 0]);
  as.add(floor);
  as.add(mesh(new THREE.TorusGeometry(3.2, 0.03, 6, 60), MS(0xc09450, { glow: 0.25 }), [0, -0.16, 0], [Math.PI / 2, 0, 0]));
}
const GHOST_LOOK = { skin: 0xc4bfe6, hair: 0x5a5a8a, tunic: 0x6a5a8a, eyes: 0x8fe3ff, eyesGlow: 0.9, blush: 0x9a8fd0 };
const F = { A: null, B: null };
const particles = new Particles(as);
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
    pulse: 0, clutch: 0, iceK: 0, emit: { burn: 0, poison: 0, frost: 0, sand: 0, heat: 0, luck: 0 }, dead: false, deathT: 0, win: false, winT: 0,
  };
}
function clearArena() {
  for (const k of ['A', 'B']) if (F[k]) { as.remove(F[k].holder); as.remove(F[k].pedWrap); F[k] = null; }
  particles.clear();
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
    rows.push(`<li><button type="button" class="hi" data-slot="${slot}" data-id="${e.id}" aria-label="${def.name}: what it does"><img src="${studio.icon(e.id)}" alt=""><div><div class="nm r-${def.rarity}">${def.name}</div>${timed ? '<div class="cd"><i></i></div>' : ''}</div></button></li>`);
  }
  return `<div class="hud-head"><span class="hud-name">${name}</span><span class="hud-sub">${sub}</span></div>
    <div class="hpbar"><div class="hp-lag"></div><div class="hp-fill"></div><div class="hp-sh"></div><span class="hp-text"></span></div>
    <div class="schips"></div>
    <ul class="hud-items">${rows.join('')}</ul>`;
}
function startBattle() {
  closeSheet();
  hideTip();
  statusTip = null;
  const ghost = makeGhost(S.day, rng);
  const playerEquip = Object.fromEntries(ALL_SLOTS.map(k => [k, S.equip[k] ? { ...S.equip[k] } : null]));
  const seed = Math.floor(rng() * 2 ** 31);
  const sim = simulate({ name: 'You', equip: playerEquip }, { name: ghost.name, equip: ghost.equip }, ITEMS, seed);
  Object.assign(B, { sim, ghost, T: -INTRO, ei: 0, ai: 0, fi: -1, done: false, playing: true, flash: {}, playerEquip, fatigueShown: false, hitStop: 0, shake: 0, banner: false });
  clearArena();
  F.A = makeFighterView('A', playerEquip, {});
  F.B = makeFighterView('B', ghost.equip, GHOST_LOOK);
  $('hud-A').innerHTML = hudHTML('A', 'You', `Day ${S.day} build`, playerEquip);
  $('hud-B').innerHTML = hudHTML('B', ghost.name, `Ghost · Day ${S.day}`, ghost.equip);
  $('vs-a').textContent = 'You';
  $('vs-b').textContent = ghost.name;
  $('log').innerHTML = '';
  $('floats').innerHTML = '';
  $('result').hidden = true;
  $('fight').disabled = true;
  $('fight').textContent = 'Fighting';
  screenEl.classList.add('in-battle');
  $('phase').textContent = 'Battle';
  sizeArena();
  logLine(`<b>${ghost.name}</b> enters: a ${ghost.schools.join(' and ')} build.`);
  updateHud(true);
}

const hudCache = { A: {}, B: {} };
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
  const n = k === 'frozen' ? 0 : k === 'heat' ? s.heat : k === 'luck' ? s.luck : s.st[k];
  switch (k) {
    case 'burn': return [`Burn ${n}`, `Takes ${n} damage every second, then loses 1 stack. Burn hits Shield first, and healing is ${pct(1 - RULES.BURN_HEAL_CUT)} weaker while burning.`];
    case 'poison': return [`Poison ${n}`, `Takes ${n} damage every ${RULES.POISON_EVERY}s. Poison never wears off and ignores Shield.`];
    case 'frost': return [`Frost ${n} / ${RULES.FREEZE_AT}`, `${RULES.FREEZE_AT - n} more Frost freezes this fighter for ${RULES.FREEZE_TIME}s, stopping their weapon and items. After a freeze, Frost can't build for ${RULES.THAW_TIME}s.`];
    case 'slow': return [`Slow ${n}`, `Weapon and items run ${pct(Math.min(n * RULES.SPEED_PER, 0.6))} slower (${pct(RULES.SPEED_PER)} per stack). Loses 1 stack every 2s, and cancels Heat 1 for 1.`];
    case 'sand': return [`Sand ${n}`, `Weapon attacks miss ${pct(Math.min(n, RULES.SAND_CAP) * RULES.SAND_MISS)} of the time (${pct(RULES.SAND_MISS)} per stack, up to ${pct(RULES.SAND_CAP * RULES.SAND_MISS)}). A miss triggers no on-hit effects. Loses 1 stack every 2s.`];
    case 'heat': return [`Heat ${n}`, `Weapon and items run ${pct(n * RULES.SPEED_PER)} faster (${pct(RULES.SPEED_PER)} per stack). Cancels Slow 1 for 1. Caps at ${RULES.HEAT_CAP} unless an item removes the cap.`];
    case 'luck': return [`Luck ${n}`, `Crit chance is ${pct(RULES.BASE_CRIT + n * RULES.LUCK_PER)} (${pct(RULES.BASE_CRIT)} base + ${pct(RULES.LUCK_PER)} per Luck). Every other chance-based effect also gets +${pct(n * RULES.LUCK_PER)}.`];
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
  li.innerHTML = `<span class="t">${at.toFixed(1)}s</span>${html}`;
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
const KIND_COLOR = { hit: '#fff4e0', burn: '#ff9a4a', poison: '#a8e05a', pure: '#e9b8ff', reflect: '#ffd27a', fatigue: '#d08aff', self: '#ff8a8a' };
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
      if (!quiet && n > 0) {
        floatText(e.side, `${e.crit ? 'Crit ' : ''}${n}`, KIND_COLOR[e.kind] ?? '#fff', e.crit ? 'big' : e.kind === 'hit' ? '' : 'small');
        fxDamage(e);
      }
      if (e.kind === 'hit') log(`<b>${sideName(other(e.side))}</b> hit <b>${sideName(e.side)}</b> for ${n}${e.crit ? ' <span class="crit">(crit)</span>' : ''}${e.absorbed >= 1 ? `, ${Math.round(e.absorbed)} blocked` : ''}.`);
      else if (e.kind === 'burn' || e.kind === 'poison') log(`<span class="k-${e.kind}">${e.kind === 'burn' ? 'Burn' : 'Poison'}</span> deals ${n} to <b>${sideName(e.side)}</b>${e.crit ? ' <span class="crit">(crit)</span>' : ''}.`);
      else if (e.kind === 'pure') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'take', 'takes')} ${n} damage.`);
      else if (e.kind === 'reflect') log(`${e.side === 'A' ? 'Your' : `<b>${sideName(e.side)}</b>'s`} attack is reflected for ${n}.`);
      else if (e.kind === 'self') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'pay', 'pays')} ${n} HP.`);
      break;
    }
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
        if (e.n >= 2) floatText(e.side, `+${e.n} ${STATUS_NAME[e.type]}`, getComputedStyle(document.documentElement).getPropertyValue(STATUS_VAR[e.type]) || '#fff', 'small');
        const f = F[e.side];
        particles.burst(f.holder.position.x, 1.0, 0.1, Math.min(10, 2 + e.n), ST_COLOR[e.type], { max: 1.6, life: 0.4, g: 0 });
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
function finishBattle() {
  if (B.done) return;
  B.done = true;
  B.playing = false;
  const r = B.sim.result;
  const outcome = r === 'A' ? 'win' : r === 'B' ? 'loss' : 'draw';
  const title = { win: 'Victory', loss: 'Defeat', draw: 'Draw' }[outcome];
  const sub = {
    win: `You beat the ${B.ghost.name}. +1 win.`,
    loss: `The ${B.ghost.name} beat you. You lose a life.`,
    draw: 'Nobody survived the fight. No change to wins or lives.',
  }[outcome];
  const runEnds = (outcome === 'win' && S.wins + 1 >= S.goal) || (outcome === 'loss' && S.lives - 1 <= 0);
  logLine(`<b>${title}</b> after ${B.sim.duration.toFixed(1)}s.`);
  const res = $('result');
  res.innerHTML = `<div class="result-card"><span class="result-title ${outcome}">${title}</span><span class="result-sub">${sub}</span><span class="result-sub">The fight lasted ${B.sim.duration.toFixed(1)}s.</span><button type="button" class="btn primary" id="continue">${runEnds ? 'See run results' : `Continue to Day ${S.day + 1}`}</button></div>`;
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
function showRunOver() {
  const won = S.wins >= S.goal;
  const m = $('runover');
  const rec = S.record.map(r => `<i class="${r[0]}" title="${r}"></i>`).join('');
  m.innerHTML = `<div class="result-card" role="dialog" aria-modal="true" aria-labelledby="ro-title">
    <span class="result-title ${won ? 'win' : 'loss'}" id="ro-title">${won ? 'Run complete' : 'Out of lives'}</span>
    <span class="result-sub">${won ? `You reached ${S.goal} wins on Day ${S.day}.` : `Your run ended on Day ${S.day} with ${S.wins} win${S.wins === 1 ? '' : 's'}.`}</span>
    <div class="record" aria-label="Fight record">${rec}</div>
    <button type="button" class="btn primary" id="newrun">Start a new run</button></div>`;
  m.hidden = false;
  $('newrun').addEventListener('click', () => { m.hidden = true; newRun(); });
  $('newrun').focus();
}
function newRun() {
  Object.assign(S, { day: 1, gold: 10, lives: 5, wins: 0, equip: emptyEquip(), bag: Array(6).fill(null), shop: [], sel: null, record: [] });
  refreshShop();
  commit();
  sizeHero();
}

$('fight').addEventListener('click', startBattle);
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
      bolts.launch(handPos(F[e.by]), chestPos(F[e.side]), e.t - LEAD, e.t, ST_COLOR[e.type][0]);
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
  const rates = {
    burn: st.burn > 0 ? Math.min(28, 4 + st.burn * 1.5) : 0,
    poison: st.poison > 0 ? Math.min(14, 2 + st.poison * 0.7) : 0,
    frost: st.frost > 0 && !s.frozen ? 2 + st.frost * 0.8 : 0,
    sand: st.sand > 0 ? Math.min(22, 3 + st.sand * 1.2) : 0,
    heat: s.heat > 0 ? Math.min(10, s.heat * 0.5) : 0,
    luck: s.luck > 0 ? Math.min(8, 1 + s.luck * 0.4) : 0,
  };
  for (const k of Object.keys(rates)) {
    f.emit[k] += rates[k] * dt;
    while (f.emit[k] >= 1) {
      f.emit[k] -= 1;
      if (k === 'burn') particles.emit({ x: x + (R() - 0.5) * 0.5, y: 0.3 + R() * 1.3, z: (R() - 0.5) * 0.4, vx: (R() - 0.5) * 0.3, vy: 0.9 + R() * 0.8, life: 0.5 + R() * 0.4, size: 0.035 + R() * 0.03, color: R() < 0.5 ? 0xff8a2a : 0xffd04a });
      if (k === 'poison') particles.emit({ x: x + (R() - 0.5) * 0.5, y: 0.2 + R() * 1.0, z: (R() - 0.5) * 0.4, vx: (R() - 0.5) * 0.2, vy: 0.35 + R() * 0.35, life: 1 + R() * 0.4, size: 0.04 + R() * 0.035, color: R() < 0.5 ? 0x8bd34a : 0x5aa83a, grow: true });
      if (k === 'frost') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 1.9 + R() * 0.3, z: (R() - 0.5) * 0.6, vx: (R() - 0.5) * 0.2, vy: -0.45 - R() * 0.2, life: 1.2, size: 0.03, color: 0xdff6ff, grow: true });
      if (k === 'sand') particles.emit({ x, y: 1.25 + R() * 0.5, vy: (R() - 0.5) * 0.3, life: 0.7 + R() * 0.4, size: 0.025 + R() * 0.02, color: R() < 0.5 ? 0xdbb470 : 0xc9a060, orbit: { cx: x, r: 0.42 + R() * 0.2, a: R() * Math.PI * 2, w: 4 + R() * 2 } });
      if (k === 'heat') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 0.05, z: (R() - 0.5) * 0.6, vy: 0.8 + R() * 0.6, life: 0.6, size: 0.03, color: 0xffb04a });
      if (k === 'luck') particles.emit({ x: x + (R() - 0.5) * 0.9, y: 0.4 + R() * 1.4, z: (R() - 0.5) * 0.5, vy: 0.15, life: 0.6, size: 0.05, color: 0xf4c652, grow: true });
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
  hero = buildHero({}, m);
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
  if (screenEl.classList.contains('in-battle')) {
    const simDt = stepBattle(dt);
    animateFighters(t, dt, simDt);
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
sizeHero();
requestAnimationFrame(loop);

// Test hook, only with ?debug in the URL.
if (location.search.includes('debug')) window.__game = { S, ITEMS, inst, commit, startBattle, B };
