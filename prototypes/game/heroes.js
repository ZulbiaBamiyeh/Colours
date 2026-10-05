// Heroes: chosen at the start of a run. Each has two schools the market leans toward, a starting item, a passive,
// and a choice of two specialisations on SPEC_DAY. Passives are read by the engine like items without a slot:
// hooks, flags, stats.luck, hp, ls (%), capBonus, freezeBonus, thornsBonus, cdMult, and cd/act. goldPerDay and goldStart are
// handled by the run (main.js) and by ghost shopping (items.js).
export const SPEC_DAY = 5;
// Chance that each gear offer is rerolled toward the hero's schools.
export const HERO_TILT = 0.35;

const LIST = [
  {
    id: 'ashen_duelist', name: 'Ashen Duelist', schools: ['Fire', 'Blood'], start: 'ember_censer',
    blurb: 'Burns hot and bleeds the enemy dry.',
    passive: { name: 'Kindled', text: 'Start of fight: gain 3 Heat and apply 1 Burn.', hooks: { start: c => { c.gain('heat', 3); return c.apply('burn', 1); } } },
    specs: [
      { id: 'blood_rite', name: 'Blood Rite', text: '+10% Lifesteal.', ls: 10 },
      { id: 'kindler', name: 'Kindler', text: 'Your Burn cap rises by 4. Start of fight: gain 2 Heat.', capBonus: { burn: 4 }, hooks: { start: c => c.gain('heat', 2) } },
    ],
  },
  {
    id: 'frost_warden', name: 'Frost Warden', schools: ['Frost', 'Holy'], start: 'frost_lantern',
    blurb: 'Locks the enemy in ice behind a wall of Shield.',
    passive: { name: 'Winter Ward', text: 'Whenever the enemy Freezes, gain 8 Shield.', hooks: { enemyFreeze: c => c.gain('shield', 8) } },
    specs: [
      { id: 'glacier_heart', name: 'Glacier Heart', text: 'Your Freezes last 1s longer.', freezeBonus: 1 },
      { id: 'bastion', name: 'Bastion', text: 'Start of fight: gain 12 Shield.', hooks: { start: c => c.gain('shield', 12) } },
    ],
  },
  {
    id: 'plague_peddler', name: 'Plague Peddler', schools: ['Venom', 'Fortune'], start: 'lucky_coin',
    blurb: 'Sells poison, and always has a little more gold.',
    passive: { name: 'Profiteer', text: 'Start the run with 3 extra gold, and gain 2 extra gold each day.', goldPerDay: 2, goldStart: 3 },
    specs: [
      { id: 'blight_ledger', name: 'Blight Ledger', text: 'Your Poison cap rises by 6.', capBonus: { poison: 6 } },
      { id: 'loaded', name: 'Loaded', text: '+3 Luck.', stats: { luck: 3 } },
    ],
  },
  {
    id: 'clockmaker', name: 'Clockmaker', schools: ['Desert', 'Lunar'], start: 'moonwell_flask',
    blurb: 'Every gear turns a little faster.',
    passive: { name: 'Clockwork', text: 'Your cooldown items fire 10% faster.', cdMult: 0.9 },
    specs: [
      { id: 'hourhand', name: 'Hourhand', text: 'Every 10s: Haste yourself for 2s.', cd: 10, act: c => c.haste(2) },
      { id: 'sandglass', name: 'Sandglass', text: 'Start of fight: apply 3 Sand and gain 1 Regen.', hooks: { start: c => { c.apply('sand', 3); return c.gain('regen', 1); } } },
    ],
  },
  {
    id: 'briar_knight', name: 'Briar Knight', schools: ['Thorn'], start: 'briar_mail',
    blurb: 'Every blow against them draws blood.',
    passive: { name: 'Thornguard', text: 'Start of fight: gain 1 Thorns.', hooks: { start: c => c.gain('thorns', 1) } },
    specs: [
      { id: 'ironbark', name: 'Ironbark', text: '+15 max HP.', hp: 15 },
      { id: 'spitesteel', name: 'Spitesteel', text: 'Your Thorns deal 1 more damage.', thornsBonus: 1 },
    ],
  },
];
export const HEROES = {};
for (const h of LIST) HEROES[h.id] = h;
export const HERO_IDS = LIST.map(h => h.id);
export const specOf = (heroId, specId) => HEROES[heroId]?.specs.find(s => s.id === specId) ?? null;
// The passives a build fights with: the hero's, plus its specialisation once chosen.
export const passivesOf = (heroId, specId) => [HEROES[heroId]?.passive, specOf(heroId, specId)].filter(Boolean);
