// Trinkets: once-per-fight moments with a clear trigger and a visible effect (design doc, Trinkets).
// They read only the current fight, never grant lasting immunity, and never switch off an opponent's build.
// Not in the market yet: they're tuned in the simulator first.
const STATUS = ['burn', 'poison', 'slow', 'sand'];
const LIST = [
  { id: 'gilded_hourglass', name: 'Gilded Hourglass', rarity: 'epic', price: 6,
    text: 'Once per fight, below 30% HP: turn to gold for 2.5s. You take no damage at all, and your Burn and Poison wait, but your weapons stop. Your other items keep working.',
    hooks: { clutch: c => { c.me.stasis = 2.5; c.moment('hourglass'); return true; } } },
  { id: 'chronoshard', name: 'Chronoshard', rarity: 'epic', price: 6,
    text: 'Once per fight, below 40% HP: rewind to your HP from 3s ago (up to 7% of your max HP).',
    hooks: {
      hp40: c => {
        const past = c.me.hist[0] ?? c.me.hp;
        const back = Math.min(Math.max(0, past - c.me.hp), c.me.maxHp * 0.07);
        if (back < 1) return false;
        c.me.hp += back;
        c.moment('rewind', { n: Math.round(back) });
        return true;
      },
    } },
  { id: 'anchor_chain', name: 'Anchor Chain', rarity: 'epic', price: 6, weaponSlow: 1.2,
    text: 'Your weapons attack 20% slower. Each hit Freezes the enemy for 1s (Freezes still leave 2s before the next).',
    hooks: { hit: c => c.freezeFoe(1) } },
  { id: 'pearl_of_the_deep', name: 'Pearl of the Deep', rarity: 'epic', price: 6,
    text: "At 12s: the enemy's Burn, Poison, Slow and Sand double, up to their caps.",
    hooks: {
      second: c => {
        if (c.t !== 12) return false;
        let any = false;
        for (const k of STATUS) {
          const v = c.foe.st[k];
          if (v > 0) { c.foe.st[k] = Math.max(v, Math.min(c.capOf(k), v * 2)); any = any || c.foe.st[k] > v; }
        }
        if (any) c.moment('pearl');
        return any;
      },
    } },
  { id: 'volcanic_heart', name: 'Volcanic Heart', rarity: 'epic', price: 6,
    text: 'Once per fight, below 30% HP: erupt. Spend all your Heat to deal 1.5 damage per Heat and apply 1 Burn per 2 Heat.',
    hooks: {
      clutch: c => {
        const h = c.me.heat;
        if (!h) return false;
        c.me.heat = 0;
        c.pure(h * 1.5);
        c.apply('burn', Math.floor(h / 2));
        c.moment('erupt', { n: h });
        return true;
      },
    } },
  { id: 'berserkers_totem', name: "Berserker's Totem", rarity: 'epic', price: 6,
    text: 'Once per fight, below 50% HP: go berserk for 5s. You attack and use items 60% faster, and take 15% more damage.',
    hooks: { hp50: c => { Object.assign(c.me, { berserk: 5, berserkSpd: 1.6, berserkTaken: 1.15 }); c.moment('berserk'); return true; } } },
  { id: 'rainbow_prism', name: 'Rainbow Prism', rarity: 'epic', price: 6, flags: { rainbow: { mode: 'equal', pool: ['burn', 'poison', 'slow'], chance: 0.5, bonus: 0.3, self: 0.3 } },
    text: 'Each Burn, Poison or Slow you apply has a 50% chance to become a random one of the three, with 30% more stacks. Each time it does, 30% chance you suffer 1 random one yourself.' },
];
export const TRINKETS = {};
for (const d of LIST) { d.slot = 'trinket'; d.schools = []; TRINKETS[d.id] = d; }
