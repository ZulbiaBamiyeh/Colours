// Game screens: the market (shop, bag, equipment, inspector) and battles against ghost builds.
import * as THREE from 'three';
import {
  ITEMS, SLOT_NAME, RARITY_NAME, SCHOOL_VAR, slotLabel, statLine, fitsSlot, rollShopId, makeGhost,
} from './items.js';
import { simulate, mulberry32, RULES } from './engine.js';
import { createStudio, buildHero, dressHero, animateHero, pedestal, heroLights, iceBlock, MS, mesh } from './models.js';

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
const emptyEquip = () => Object.fromEntries(ALL_SLOTS.map(k => [k, null]));
const S = {
  day: 1, gold: 10, lives: 5, maxLives: 5, wins: 0, goal: 10,
  equip: emptyEquip(), bag: Array(6).fill(null), shop: [], sel: null, ttStyle: 'smooth', record: [],
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
  const h = e.target.closest('.hi[data-id]');
  if (h) showTipFor(h, ITEMS[h.dataset.id]);
});
document.addEventListener('pointerout', e => {
  const b = e.target.closest('.item, .hi[data-id]');
  if (b && !b.contains(e.relatedTarget)) hideTip();
});
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
  $('tt-seg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.ttStyle)));
  tt.classList.toggle('pixel', S.ttStyle === 'pixel');
}
$('tt-seg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.ttStyle = b.dataset.v;
  syncTTSeg();
  ttDirty = true;
});

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
const hero = buildHero();
hs.add(hero.root);
hs.add(pedestal());
let heroYaw = 0.38;
function sizeHero() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  hr.setSize(w, h, false);
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
function makeFighterView(side, equip, look) {
  const h = buildHero(look);
  dressHero(h, equip, ITEMS);
  const holder = new THREE.Group();
  const x = side === 'A' ? -1.45 : 1.45;
  holder.position.x = x;
  const ped = pedestal();
  holder.add(ped);
  h.root.rotation.y = side === 'A' ? 0.8 : -0.8;
  holder.add(h.root);
  const ice = iceBlock();
  ice.visible = false;
  holder.add(ice);
  as.add(holder);
  return { hero: h, holder, ice, x, dir: side === 'A' ? 1 : -1, lunge: 0, shake: 0 };
}
function clearArena() {
  for (const k of ['A', 'B']) if (F[k]) { as.remove(F[k].holder); F[k] = null; }
}
function sizeArena() {
  const w = arenaStage.clientWidth, h = arenaStage.clientHeight;
  if (!w || !h) return;
  ar.setSize(w, h, false);
  ac.aspect = w / h;
  const tanH = Math.tan(THREE.MathUtils.degToRad(ac.fov / 2));
  const d = Math.max(1.75 / tanH, 2.75 / (tanH * ac.aspect));
  ac.position.set(0, 1.25 + d * 0.12, d);
  ac.lookAt(0, 1.0, 0);
  ac.updateProjectionMatrix();
}
new ResizeObserver(sizeArena).observe(arenaStage);

const B = { sim: null, ghost: null, T: 0, speed: 1, ei: 0, fi: -1, done: false, playing: false, flash: {}, playerEquip: null };
function hudHTML(side, name, sub, equip) {
  const rows = [];
  const order = ['weapon', 'offhand', 'helm', 'body', 'gloves', 'boots', 'cape', 'ring1', 'ring2', 'amulet'];
  if (!equip.weapon) rows.push(`<li class="hi" data-slot="weapon"><span class="fist" aria-hidden="true">✊</span><div><div class="nm">Fists</div><div class="cd"><i></i></div></div></li>`);
  for (const slot of order) {
    const e = equip[slot];
    if (!e) continue;
    const def = ITEMS[e.id];
    const timed = def.weapon || def.dual || def.cd;
    rows.push(`<li class="hi" data-slot="${slot}" data-id="${e.id}"><img src="${studio.icon(e.id)}" alt=""><div><div class="nm r-${def.rarity}">${def.name}</div>${timed ? '<div class="cd"><i></i></div>' : ''}</div></li>`);
  }
  return `<div class="hud-head"><span class="hud-name">${name}</span><span class="hud-sub">${sub}</span></div>
    <div class="hpbar"><div class="hp-fill"></div><div class="hp-sh"></div><span class="hp-text"></span></div>
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
  Object.assign(B, { sim, ghost, T: 0, ei: 0, fi: -1, done: false, playing: true, flash: {}, playerEquip, fatigueShown: false });
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
  const fi = Math.min(B.sim.frames.length - 1, Math.floor(B.T / 0.1 + 1e-6));
  if (fi === B.fi && !force) return;
  B.fi = fi;
  const fr = B.sim.frames[fi];
  for (const side of ['A', 'B']) {
    const s = fr[side];
    const root = $(`hud-${side}`);
    const pct = s.maxHp ? Math.max(0, s.hp / s.maxHp) : 0;
    const fill = root.querySelector('.hp-fill');
    fill.style.width = `${(pct * 100).toFixed(1)}%`;
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
    const F_ = F[side];
    F_.ice.visible = s.frozen;
  }
  const clock = $('clock');
  clock.textContent = `${fr.t.toFixed(1)}s${fr.t >= 25 ? ' · Fatigue' : ''}`;
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
function hideStatusTip() { statusTip = null; tip.hidden = true; }
document.addEventListener('click', e => {
  const chip = e.target.closest('.schip[data-st]');
  if (chip) { showStatusTip(chip, true); return; }
  if (statusTip) hideStatusTip();
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
document.addEventListener('keydown', e => { if (e.key === 'Escape' && statusTip) hideStatusTip(); });

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
  _p.set(f.x, 2.35, 0).project(ac);
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
function playEvent(e, quiet) {
  const other = s => (s === 'A' ? 'B' : 'A');
  const log = html => logLine(html, e.t);
    const verb = (side, you, them) => (side === 'A' ? you : them);
  switch (e.type) {
    case 'attack':
      if (!quiet) F[e.side].lunge = 1;
      break;
    case 'dmg': {
      const n = Math.round(e.n);
      if (!quiet && n > 0) {
        floatText(e.side, `${e.crit ? 'Crit ' : ''}${n}`, KIND_COLOR[e.kind] ?? '#fff', e.crit ? 'big' : e.kind === 'hit' ? '' : 'small');
        if (e.kind === 'hit') F[e.side].shake = 1;
      }
      if (e.kind === 'hit') log(`<b>${sideName(other(e.side))}</b> hit <b>${sideName(e.side)}</b> for ${n}${e.crit ? ' <span class="crit">(crit)</span>' : ''}${e.absorbed >= 1 ? `, ${Math.round(e.absorbed)} blocked` : ''}.`);
      else if (e.kind === 'burn' || e.kind === 'poison') log(`<span class="k-${e.kind}">${e.kind === 'burn' ? 'Burn' : 'Poison'}</span> deals ${n} to <b>${sideName(e.side)}</b>${e.crit ? ' <span class="crit">(crit)</span>' : ''}.`);
      else if (e.kind === 'pure') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'take', 'takes')} ${n} damage.`);
      else if (e.kind === 'reflect') log(`${e.side === 'A' ? 'Your' : `<b>${sideName(e.side)}</b>'s`} attack is reflected for ${n}.`);
      else if (e.kind === 'self') log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'pay', 'pays')} ${n} HP.`);
      break;
    }
    case 'miss':
      if (!quiet) floatText(e.side, 'Miss', '#e8dcc0', 'small');
      log(`<b>${sideName(other(e.side))}</b> missed.`);
      break;
    case 'heal':
      if (!quiet && e.n >= 1) floatText(e.side, `+${Math.round(e.n)}`, '#8fe08a', 'small');
      break;
    case 'shield':
      if (!quiet && e.n >= 1) floatText(e.side, `+${Math.round(e.n)} Shield`, '#8fd0ff', 'small');
      break;
    case 'status':
      if (!quiet && e.n >= 2) floatText(e.side, `+${e.n} ${STATUS_NAME[e.type]}`, getComputedStyle(document.documentElement).getPropertyValue(STATUS_VAR[e.type]) || '#fff', 'small');
      break;
    case 'freeze':
      if (!quiet) floatText(e.side, 'Frozen!', '#9fe2ff', 'banner');
      log(`<b>${sideName(e.side)}</b> ${verb(e.side, 'are', 'is')} <span class="k-frost">Frozen</span> for ${e.dur}s.`);
      break;
    case 'clutch':
      if (!quiet) floatText(e.side, 'Clutch!', '#f4c652', 'banner');
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

function stepBattle(dt) {
  if (!B.playing) return;
  B.T += dt * B.speed;
  const evs = B.sim.events;
  while (B.ei < evs.length && evs[B.ei].t <= B.T) playEvent(evs[B.ei++], false);
  if (B.T >= B.sim.duration) {
    B.T = B.sim.duration;
    updateHud(true);
    if (B.T + 0.001 >= B.sim.duration && B.ei >= evs.length) { B.playing = false; setTimeout(finishBattle, 700); }
  } else {
    updateHud(false);
  }
}
function animateFighters(t, dt) {
  for (const side of ['A', 'B']) {
    const f = F[side];
    if (!f) continue;
    animateHero(f.hero, t + (side === 'B' ? 1.3 : 0), dt, reduceMotion);
    f.lunge = Math.max(0, f.lunge - dt * 4.5);
    f.shake = Math.max(0, f.shake - dt * 5);
    const lungeX = reduceMotion ? 0 : Math.sin(f.lunge * Math.PI) * 0.4 * f.dir;
    const shakeX = reduceMotion ? 0 : Math.sin(f.shake * 40) * 0.05 * f.shake;
    f.holder.position.x = f.x + lungeX + shakeX;
    if (B.done && B.sim) {
      const lost = (B.sim.result === 'A' && side === 'B') || (B.sim.result === 'B' && side === 'A') || B.sim.result === 'draw';
      if (lost) f.hero.root.rotation.z += (-(f.dir) * 1.35 - f.hero.root.rotation.z) * Math.min(1, dt * 4);
    }
  }
  for (const key of Object.keys(B.flash)) {
    B.flash[key] -= dt;
    if (B.flash[key] <= 0) {
      const [side, slot] = key.split(':');
      $(`hud-${side}`).querySelector(`.hi[data-slot="${slot}"]`)?.classList.remove('flash');
      delete B.flash[key];
    }
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
    stepBattle(dt);
    animateFighters(t, dt);
    ar.render(as, ac);
  } else {
    if (!reduceMotion) { ttYaw += dt * 0.8; ttDirty = true; }
    if (ttDirty) { drawTurntable(); ttDirty = false; }
    animateHero(hero, t, dt, reduceMotion);
    hero.root.rotation.y += (heroYaw - hero.root.rotation.y) * 0.18;
    hr.render(hs, hc);
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
