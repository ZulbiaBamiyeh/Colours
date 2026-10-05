# Equip Autobattler: Design Doc

*Working title: TBD. All numbers are starting values for the simulator, not final balance.*

## 1. Pitch

An autobattler in the spirit of Backpack Battles, without the backpack. Instead of fitting shapes into a grid, you fill an RPG-style equipment screen (RuneScape / MapleStory). Each day you visit a shop, buy and upgrade gear, then fight another player's build from the same day automatically.

The depth comes from three layers:

1. **Keywords** (Burn, Frost, Sand, ...) with simple rules that counter each other.
2. **Slots** that decide *how* an item triggers, while its **school** decides *what* it does. Every school can fill every slot, so you can stack one school or combine two.
3. **Bridges and legendaries** that connect schools into a web of builds, plus gems and sockets that change what each item does.

## 2. Run structure (proposed)

| Element | Rule |
|---|---|
| Goal | Reach **10 wins** before losing **5 lives**. Draws cost nothing. |
| Day | Shop phase, then one fight. |
| Opponent | An asynchronous ghost: a snapshot of another player's build from the same day number. |
| Gold | 10 per day. Unspent gold carries over. |
| Shop | 5 gear offers plus 3 Jeweler offers (gems). Reroll 1 gold rerolls both shelves. Lock gear offers between days. Sell items for 50%; their gems come back to you. |
| Lucky Merchant | Every 3rd day, one Jeweler offer is a guaranteed rare gem (Echo, Quicksilver or Catalyst) at 1 gold off. |
| Bag | Two tabs. **Equip:** 6 slots for items you're holding (a bench, not a build slot). **Gems:** 6 slots for gems, stacking up to 9 of each. |
| Rarity by day | Common and Rare from day 1, Epic from day 3, Legendary from day 5 (rare). |
| Relic days | Days 5 and 10: choose 1 of 3 legendaries. |
| Classes | Not yet. Weapon choice and school stacking act as soft classes for now. |

## 3. Combat basics

| Rule | Value |
|---|---|
| Base HP | 100. Armour (helm, body, gloves, boots, cape) adds HP by rarity: Common +6, Rare +10, Epic +15, Legendary +20. |
| Weapon | Sets your attack interval and base damage. Accuracy starts at 100%. |
| Crit | Base 5% chance. A crit deals 2× damage. |
| Speed | Heat and Slow change the speed of your weapon and every cooldown. Net speed is clamped between 40% and 250%. |
| Fatigue | From 25s, both fighters take 1 damage per second, rising by 1 each second. Fatigue ignores Shield. In battle it shows as a sandstorm that builds over the arena, with a damage number on each fighter every second. |
| Draw | If both fighters die on the same tick, the fight is a draw. |

**Resolution order each tick:** Burn ticks, then Poison ticks, then weapons and cooldowns fire (weapon, then offhand, then the other slots top to bottom), then reactions resolve. A fixed order keeps fights deterministic, so ghosts replay identically.

## 4. Keywords

| Keyword | Affects | Rule |
|---|---|---|
| **Burn** | enemy | Deals 1 damage per stack every 2s, dealt continuously. **Never wears off.** Caps at 8 stacks (16 with Wildfire). Damages Shield first. **A burning fighter receives 20% less healing.** |
| **Poison** | enemy | Deals 1 damage per stack every 3s, dealt continuously. **Never wears off.** Caps at 20 stacks. **Bypasses Shield.** |

*No decay (like Backpack Battles):* statuses stay for the whole fight, so even a small random application keeps working. Caps, Fatigue from 25s and Cleanse are the brakes. Frost is the exception: it's a meter that empties when the enemy Freezes.

*Continuous damage, tick effects:* Burn and Poison drain HP smoothly at their advertised rate, but "whenever Burn ticks" (every 1s) and "whenever Poison ticks" (every 3s) still happen on that schedule. A tick that crits repeats the damage dealt since the last tick, and tick effects like Phoenix Heart and Leechmaw Ring use that amount. Coiled Serpent stops the drain and strikes on every 5th Poison tick instead.
| **Frost** | enemy | At 10 stacks the enemy is **Frozen** for 1.5s: weapon and cooldowns pause (statuses still tick). Frost then resets to 0, and the enemy **Thaws** for 2s, during which it can't gain Frost. |
| **Slow** | enemy | −3% speed per stack, up to 25 stacks. **Never wears off.** **Slow and Heat on the same fighter cancel 1:1.** |
| **Sand** | enemy | −4% weapon accuracy per stack, up to 15 stacks (60% miss chance). **Never wears off.** Affects weapon attacks only, including dual-wield offhands. **A missed attack triggers nothing.** |
| **Shield** | you | Absorbs damage before HP. Doesn't decay. |
| **Heal** | you | Restores HP up to your max. Healing beyond max is **overheal** and is lost unless an item uses it. **Lifesteal counts as healing.** |
| **Lifesteal** | you | Heals you for a percentage of the weapon damage you deal, including damage to Shield. |
| **Luck** | you | +3% crit chance per stack, **and +3 percentage points to every other chance-based effect.** |
| **Heat** | you | +3% speed per stack, up to 20 stacks. Doesn't decay. |
| **Thorns** | you | Whenever an enemy weapon hit lands on you, deal damage equal to your Thorns to the attacker. Up to 20 stacks. Doesn't decay. **Misses don't trigger it.** Thorns damage hits Shield first, isn't a weapon hit (so it never triggers on-hit or when-hit effects, and two Thorns fighters can't loop), and counts as "Thorns triggering" for items. |
| **Regen** | you | Heals 1 per stack every 2s. Never wears off. Caps at 8 stacks. Counts as healing, so Burn cuts it. |
| **Cleanse N** | you | Removes N stacks from your biggest debuff, one stack at a time (Burn, Poison, Slow or Sand; never the Frost meter). |
| **Prismatic** | item | Counts as every school (see resonance limits). Its random rolls are weighted toward schools you're wearing. |

### Trigger words

| Term | Meaning |
|---|---|
| **On hit** | Your weapon attack lands (not missed). Dual-wield offhands have their own on-hit effects. |
| **When hit** | An enemy weapon attack lands on you. |
| **When attacked** | An enemy weapon attack is made against you, hit or miss. |
| **On crit** | One of your weapon hits crits (or another effect crits, where an item allows it). |
| **Start of fight** | Once, at 0s. |
| **Clutch** | Once per fight, when you first drop below 30% HP. |
| **Apply / gain** | Apply puts a status on the enemy. Gain gives something to you. |

### Natural counters

These come from the rules themselves, before any items:

- Burn beats Heal (healing cut), Shield beats Burn, Poison beats Shield, Heal beats Poison (outheals the slow ramp).
- Cleanse and Regen beat status builds; burst and Burn (which cuts Regen) beat Lunar.
- Sand beats weapon builds (crit, Lifesteal, on-hit). Burn and Poison beat Sand (they never miss). Fast weapon burst beats the slow Poison ramp.
- Frost and Slow beat Heat and speed builds. Heat cancels Slow.
- Thorns beats fast and multi-hit builds (dual wield, Heat, crit daggers): every hit pays. Burn and Poison beat Thorns (no hits to punish), and so do Sand, Frost and Slow (fewer hits land).

## 5. Slots

**The slot decides how an item triggers. The school decides what it does.**

| Slot | Trigger type | Notes |
|---|---|---|
| Weapon | **On hit** | Your attack clock. Light (about 1–2.5s) or heavy two-handed (about 3.5–4.5s). |
| Offhand | **Cooldown** | A second clock. Some offhands are dual-wield weapons with their own attack. Empty when using a two-handed weapon. |
| Helm | **While** a condition holds | Scaling passives. |
| Body | **When hit / when attacked** | Punishes or reacts to enemy attacks. |
| Gloves | **On crit** | Every school has crit payoffs, so Luck pairs with everything. |
| Boots | **Start of fight** | Your opening move. |
| Cape | **Clutch** | Once per fight, below 30% HP. |
| Ring ×2 | **"Whenever you…"** payoffs | Single-school payoffs **and all bridge items**. Bridges appear only in rings. |
| Amulet | **Legendary** | Legendaries only appear in the amulet slot, so you can only ever have one. |

**Two-handed weapons** leave the offhand empty and are budgeted for about 35% more damage per second than one-handed weapons.

**Dual wield**: a dual-wield offhand is a second weapon clock. Gloves effects, weapon-hit bridges and helm weapon bonuses apply to both weapons. Sand affects both.

## 6. Schools and resonance

| School | Keywords |
|---|---|
| Fire | Burn, Heat |
| Frost | Frost, Slow |
| Venom | Poison |
| Desert | Sand |
| Holy | Heal, Shield |
| Blood | Lifesteal |
| Fortune | Luck |
| Thorn | Thorns |
| Lunar | Regen, Cleanse |
| Prismatic | Random effects |

Every item has a school. Bridge rings and bridge legendaries count toward **both** schools. Equipping items from one school activates **resonance**. Tiers are cumulative, so 6 items also give the 2- and 4-item bonuses:

| School | 2 items | 4 items | 6 items |
|---|---|---|---|
| Fire | Burn you apply +1 | Start with 4 Heat; Heat cap 25 | Burn loses a stack every 2 ticks instead of every tick |
| Frost | Freeze lasts +0.5s | Slow you apply +1 | Freeze triggers at 8 Frost instead of 10 |
| Venom | Start of fight: apply 3 Poison | Poison ticks every 1.5s | Poison ticks every 1s |
| Desert | Sand decays half as fast | Enemies with 10+ Sand deal 15% less damage | Sand cap 20 (80% miss chance) |
| Holy | Start with 10 Shield | Heals +20% | Shield gains +50% |
| Blood | +5% Lifesteal | Lifesteal ignores Burn's healing cut | Lifesteal doubled while below 50% HP |
| Fortune | +3 Luck | Crits deal 2.5× | Every chance roll rolls twice and keeps the better result |
| Thorn | Start with 2 Thorns | Clutch: gain 5 Thorns | Thorns deal +50% damage |
| Lunar | Start with 2 Regen | Cleanse also triggers every Regen tick | Regen cap 12 |

**Prismatic resonance** (3+ Prismatic items): amounts from random effects +50%. Prismatic items count toward every school, **but only one Prismatic item counts toward school resonance.**

Single-school builds reach tier 6 and hit hardest, but they're fragile against their counter. Two-school builds reach two mid tiers and cover each other's weaknesses.

---

## 7. Item catalog: single-school items

Rarity: C = Common, R = Rare, E = Epic, L = Legendary.

*The prototype's first tuning pass changed some numbers (for example Poison ticks every 3s and several Fire and Venom items are weaker). The prototype's `items.js` is the source of truth for current values; this catalog shows the original design.*

### Fire (Burn, Heat)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Cinder Knife | C | Dagger · 1.0s · 3 dmg. On hit: apply 1 Burn. |
| Weapon (2H) | Sunbrand | R | Greatsword · 4.0s · 22 dmg. On hit: apply 3 Burn, gain 2 Heat. |
| Offhand | Ember Censer | C | Every 4s: apply 4 Burn. |
| Offhand | Kindled Brazier | R | Every 4s: gain 2 Heat. |
| Helm | Pyromancer's Hood | R | While the enemy has 5+ Burn, Burn you apply +1. |
| Body | Ember Ward | C | When hit: apply 2 Burn to the attacker. |
| Gloves | Stoked Gauntlets | R | On crit: apply 3 Burn and gain 1 Heat. |
| Boots | Firewalkers | C | Start of fight: gain 6 Heat. |
| Cape | Phoenix Cloak | E | Clutch: apply 10 Burn and gain 5 Heat. |
| Ring | Ashen Ring | R | Burn ticks deal +1 damage per 5 Heat you have. |
| Amulet | Wildfire | L | Your Burn cap rises from 8 to 16. While you have 8+ Heat, your Burn deals 25% more damage. |
| Amulet | Molten Core | L | Heat has no cap. You lose 1 HP per second per 5 Heat. |

### Frost (Frost, Slow)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Rimed Saber | C | Sword · 2.2s · 7 dmg. On hit: apply 2 Frost. |
| Weapon (2H) | Glacier Maul | R | Maul · 4.5s · 26 dmg. On hit: apply 3 Frost and 2 Slow. |
| Offhand | Frost Lantern | C | Every 3s: apply 3 Frost. |
| Offhand | Winter's Bell | C | Every 4s: apply 3 Slow. |
| Helm | Rimecrown | R | While the enemy is Frozen, your weapons deal +40% damage. |
| Body | Glacial Plate | C | When hit: apply 1 Frost and 1 Slow to the attacker. |
| Gloves | Frostbite Grips | R | On crit: apply 3 Frost. |
| Boots | Snowtread Boots | C | Start of fight: apply 6 Slow. |
| Cape | Winter's Shroud | E | Clutch: Freeze the enemy for 3s, ignoring Thaw. |
| Ring | Rimeheart Ring | R | Whenever the enemy Freezes, apply 5 Slow. |
| Amulet | Heart of Winter | L | Whenever the enemy Freezes, consume all their Slow and deal 4 damage per stack. *(Resolves before other Freeze triggers, so Rimeheart's Slow builds toward the next Freeze.)* |

### Venom (Poison)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Asp Fang | C | Dagger · 1.2s · 3 dmg. On hit: apply 1 Poison. |
| Weapon (2H) | Blightreaper | R | Scythe · 4.0s · 18 dmg. On hit: apply 4 Poison. |
| Offhand | Stinger | C | Dual wield · 1.5s · 2 dmg. On hit: apply 1 Poison. |
| Helm | Plague Mask | R | While the enemy has 10+ Poison, your weapon hits apply +1 Poison. |
| Body | Venom Carapace | C | When hit: apply 2 Poison to the attacker. |
| Gloves | Envenomed Gloves | R | On crit: apply 3 Poison. |
| Boots | Mire Boots | C | Start of fight: apply 5 Poison. |
| Cape | Last Bite | E | Clutch: double the enemy's Poison. |
| Ring | Festering Ring | R | Whenever Poison ticks: 25% chance to apply 1 Poison. |
| Amulet | Coiled Serpent | L | Poison ticks deal no damage. Instead, every 5th tick strikes for 6× its stacks, and the strike can crit. |

### Desert (Sand)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Dune Scimitar | C | Scimitar · 2.0s · 6 dmg. On hit: apply 2 Sand. |
| Weapon (2H) | Sandstorm Glaive | R | Glaive · 3.5s · 18 dmg. On hit: apply 4 Sand. |
| Offhand | Sand Pouch | C | Every 3s: apply 3 Sand. |
| Helm | Nomad's Wrap | R | While the enemy has 10+ Sand, their weapon hits deal 15% less damage. |
| Body | Dustveil Robe | C | When hit: apply 3 Sand to the attacker. |
| Gloves | Grit Gloves | R | On crit: apply 4 Sand. |
| Boots | Dust Devils | C | Start of fight: apply 8 Sand. |
| Cape | Sirocco Cloak | E | Clutch: set the enemy's Sand to its cap. |
| Ring | Dune Ring | R | Whenever an enemy attack misses: apply 1 Sand. |
| Amulet | Mirage | L | Enemy attacks that miss hit the enemy instead, with their own on-hit effects. |

### Holy (Heal, Shield)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Warden's Mace | C | Mace · 3.0s · 9 dmg. On hit: gain 4 Shield. |
| Weapon (2H) | Dawnhammer | R | Hammer · 4.5s · 20 dmg. On hit: heal 6 and gain 6 Shield. |
| Offhand | Oak Buckler | C | Every 4s: gain 7 Shield. |
| Offhand | Hymnal | C | Every 5s: heal 10. |
| Helm | Gilded Halo | R | While you have Shield, your heals are 25% stronger. |
| Body | Bastion Plate | C | When hit: gain 3 Shield. |
| Gloves | Mending Gloves | R | On crit: heal 5. |
| Boots | Pilgrim's Sandals | C | Start of fight: gain 15 Shield. |
| Cape | Guardian's Mantle | E | Clutch: gain Shield equal to 40% of your max HP. |
| Ring | Sanctified Vessel | R | Whenever you overheal, gain that much Shield. |
| Amulet | Reliquary of Saints | L | Overhealing raises your max HP for the rest of the fight. *(Leaves no overheal for Sanctified Vessel, so the two compete.)* |
| Amulet | Juggernaut's Oath | L | Weapon hits deal bonus damage equal to 25% of your current Shield. |

### Blood (Lifesteal)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Bloodletter | C | Axe · 2.8s · 10 dmg. 25% Lifesteal. |
| Weapon (2H) | Crimson Greataxe | R | Greataxe · 4.5s · 26 dmg. 30% Lifesteal. |
| Offhand | Sacrificial Dirk | C | Dual wield · 1.6s · 3 dmg. 30% Lifesteal. |
| Helm | Vampire's Cowl | R | While below 50% HP: +15% Lifesteal. |
| Body | Bloodbound Mail | R | When hit: gain 3% Lifesteal for the rest of the fight (max +30%). |
| Gloves | Bloodied Knuckles | R | On crit: that hit's Lifesteal is doubled. |
| Boots | Blood Price | C | Start of fight: lose 10 HP. Your first 5 weapon hits have 100% Lifesteal. |
| Cape | Blood Moon Cloak | E | Clutch: your next 3 weapon hits have 100% Lifesteal. |
| Ring | Sanguine Ring | R | Whenever you Lifesteal at full HP, deal the overheal to the enemy as damage. |
| Amulet | Crimson Chalice | L | Lifesteal applies to all damage you deal, including Burn, Poison and reflected hits. |

### Fortune (Luck)

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Fortune's Edge | C | Rapier · 1.6s · 5 dmg. On hit: 20% chance to gain 1 Luck. |
| Weapon (2H) | Jackpot Cleaver | R | Cleaver · 4.0s · 20 dmg. On hit: gain 1 Luck. Its crits deal 3×. |
| Offhand | Lucky Coin | C | Every 3s: 50% chance to gain 1 Luck. |
| Helm | Gambler's Hood | R | +4 Luck. While you have 10+ Luck, crits deal 2.5×. |
| Body | Charmed Vest | C | When attacked: 30% chance to gain 1 Luck. |
| Gloves | Gauntlets of Fortune | R | On crit: gain 1 Luck. |
| Boots | Four-Leaf Boots | C | Start of fight: gain 8 Luck. |
| Cape | Last Gamble | E | Clutch: your next 3 weapon hits are guaranteed crits. |
| Ring | Loaded Dice | R | Whenever a chance roll fails (including crits), gain 1 Luck (max 10 from this ring per fight). |
| Amulet | Fatebound Talisman | L | Everything can crit: heals, Shield gains and status applications. A crit doubles them. |

### Thorn (Thorns)

Thorns is the punish-the-attacker school. Its weakness is built in (statuses and misses never trigger it), and its own items answer that weakness only partly: Ironbark Plate strikes on a timer, and the Sandbriar Ring strikes on misses.

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Briar Whip | C | Whip · 1.4s · 3 dmg. On hit: gain 1 Thorns, up to 6 from this whip. |
| Weapon (2H) | Bramble Maul | R | Maul · 3.8s · 16 dmg. On hit: deal bonus damage equal to your Thorns. |
| Offhand | Hedgehog Shield | C | Every 4s: gain 1 Thorns and 4 Shield. |
| Helm | Bramble Crown | R | When hit: 30% chance to gain 1 Thorns. (Luck raises the chance.) |
| Body | Briar Mail | C | Start of fight: gain 4 Thorns. |
| Body | Ironbark Plate | E | Every 3s: your Thorns strike the enemy. This counts as Thorns triggering. |
| Gloves | Spinefist | R | Your weapon hits deal bonus damage equal to half your Thorns. |
| Boots | Nettle Treads | C | Start of fight: gain 2 Thorns. When an enemy attack misses you, gain 1 Thorns. |
| Cape | Briar Cloak | E | Clutch: double your Thorns, then gain 3 more. |
| Amulet | Briarheart | L | Whenever your Thorns trigger, gain 1 Thorns. Your Thorns cap rises from 20 to 40. |

**How it webs with other schools:**
- **Holy:** Shield soaks the hits that trigger Thorns, and Hallowed Briar turns Shield gains into Thorns. Juggernaut and Spinefist both turn defence into weapon damage.
- **Desert:** Sand makes enemies miss, which normally starves Thorns. Nettle Treads and the Sandbriar Ring turn misses into Thorns instead, so Desert becomes a partner rather than a counter.
- **Blood:** Bloodbriar heals from Thorns damage, and Crimson Chalice's Lifesteal applies to it (it isn't a weapon hit).
- **Fortune:** Lucky Thorn lets Thorns crit, and Luck raises Bramble Crown's chance.
- **Fire:** Pyrebriar turns every Thorns trigger into Heat, so being hit makes you faster.
- **Venom and Frost:** their bridges make each Thorns trigger apply Poison or Frost, which fixes Thorns' weak matchups by borrowing the counter's own tools.
- **Prismatic:** Thorns joins the random boon pool (2 Thorns).

**Simulator results (prototype, day 9 ghosts):** Thorn-main builds win 44–52% overall. Against each school: Fire 66%, Blood 57%, Fortune 57%, Holy 54%, Desert 50%, Frost 45%, Venom 42%.

### Lunar (Regen, Cleanse)

The counter school for status builds: Regen heals steadily for the whole fight and Cleanse strips debuffs. It's weak against burst damage (it heals slowly) and against Burn (which cuts healing).

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon | Moon Sickle | C | Sickle · 1.6s · 5 dmg. On hit: gain 1 Regen, up to 5 from this sickle. |
| Weapon (2H) | Tidecaller | R | Staff · 3.2s · 17 dmg. On hit: Cleanse 2, and gain 1 Regen for each stack removed. |
| Offhand | Moonwell Flask | C | Every 5s: gain 2 Regen. |
| Offhand | Clarity Chime | R | Every 4s: Cleanse 2. |
| Helm | Crescent Circlet | R | Whenever your Regen ticks, Cleanse 1. |
| Body | Moonweave Robe | C | Start of fight: gain 3 Regen. |
| Gloves | Tidal Gloves | R | On crit: gain 2 Regen. |
| Boots | Moonstep Boots | C | Start of fight: gain 2 Regen. Whenever you Cleanse, gain 1 Regen. |
| Cape | Tide Cloak | E | Clutch: Cleanse 15 and gain 4 Regen. |
| Amulet | Mirror of the Moon | L | Stacks you Cleanse are applied to the enemy instead of vanishing. |

**Simulator results after removing decay and trimming Regen (prototype, ghost builds by main school, overall win rate on days 3 / 8 / 14):** Fire 58 / 50 / 47, Frost 43 / 47 / 51, Venom 62 / 57 / 52, Desert 42 / 47 / 46, Holy 53 / 53 / 52, Blood 51 / 54 / 53, Fortune 39 / 40 / 44, Thorn 39 / 46 / 47, Lunar 49 / 47 / 46. Regen was healing Lunar for about 85 HP a fight, 3–4× what Holy heals. With a Regen cap of 8 (was 12) and smaller sources, it heals about 60, close to Blood's Lifesteal. Lunar is the hard counter to Frost (60%) and Desert (64%), by design: Cleanse strips their stacks. Against the fuller, more mixed ghosts, every school lands at 44–59% on days 3 / 8 / 14 (Lunar 47 / 52 / 58, Blood 59 / 52 / 46).

### Prismatic (random)

Random statuses are drawn from Burn, Poison, Frost, Slow and Sand. Random boons are drawn from heal 8, 8 Shield, 2 Heat, 2 Luck, +3% Lifesteal, 2 Thorns and 2 Regen. **Weighting:** each option's weight is 1 + the number of non-Prismatic items you're wearing from that option's school.

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Weapon (2H) | Prism Staff | E | Staff · 3.0s · 10 dmg. On hit: apply a random status (2 stacks). |
| Offhand | Wishing Coin | E | Every 5s: a random boon, or a random status (3 stacks). |
| Helm | Kaleidoscope Lens | E | +5% weapon damage for each different status on the enemy. |
| Body | Chromatic Mail | E | When hit: apply a random status (2 stacks) to the attacker. |
| Gloves | Rainbow Grips | E | On crit: apply 2 different random statuses (2 stacks each). |
| Boots | Opalescent Boots | E | Start of fight: gain 3 random boons. |
| Cape | Prism Cloak | E | Clutch: trigger a random school's clutch cape effect. |
| Ring | Fool's Opal | E | Your random effects ignore weighting, and their amounts are doubled. |
| Amulet | Prism Heart | L | Whenever you apply a status, also apply a different random status at half the stacks (rounded up). |

---

## 7b. Engines: Haste and Charge

Items that link to each other, so a build is a machine you watch run rather than a pile of separate effects.

- **Haste:** your weapons and cooldown items tick 50% faster while it lasts. More Haste adds time, up to 8s. Hasted fighters show a Haste chip, and a yellow streak shows when Haste is gained.
- **Charge:** advance another item's cooldown, so it fires sooner. The target is your weapon, your offhand, your other items, or a random one. The charged item's row flashes blue in the battle panel.
- **Item fired:** a trigger for "whenever one of your cooldown items fires".

| Item | School · slot | Effect | Win rate added to its school (peers) |
|---|---|---|---|
| Bellows | Fire · offhand C | Every 5s: 2 Heat and Haste 1s | 79% (Ember Censer 75%, Kindled Brazier 79%) |
| Stoker's Gloves | Fire · gloves R | Whenever you apply Burn, Charge your offhand 0.4s | 67% (Stoked Gauntlets 67%) |
| Clockwork Snowglobe | Frost · offhand R | Every 5s: 5 Frost; whenever the enemy Freezes, Charge this 3s | 63% (Frost Lantern 67%) |
| Rime Spurs | Frost · boots C | Whenever the enemy Freezes, Haste 3.5s | 73% |
| Alembic | Venom · offhand C | Every 4s: 2 Poison and Charge your weapon 0.5s | 77% |
| Sand Timer | Desert · helm R | Every 7s: 2 Sand and Charge your other items 1s | 67% (Nomad's Wrap 67%) |
| Devotion Gauntlets | Holy · gloves R | Whenever you gain Shield, Charge your weapon 0.3s (2/s max) | 74% (Mending Gloves 69%) |
| Heartbeat Mantle | Blood · cape R | Whenever you Lifesteal, Charge weapon and offhand 0.3s (2/s max) | 76% |
| Spinning Coin | Fortune · offhand C | Every 3s: 50% Charge your weapon 0.6s, else 1 Luck | 76% (Lucky Coin 67%) |
| Thornwound Spring | Thorn · body R | Start: 1 Thorns; whenever Thorns trigger, Charge a random item 0.5s | 80% (Briar Mail 84%) |
| Tide Clock | Lunar · helm R | Every 8s: Haste 1s; the first time, also 1 Regen | 80% (Crescent Circlet 75%) |
| Clockwork Heart | Prismatic · amulet L | Whenever a cooldown item fires, Charge your weapon 0.7s | 62% (a build-around: it needs cooldown items) |

These win rates come from builds fought against identical copies of themselves, so small edges look big. Haste is a good example: 1s every 6s is only about 8% more attacks (13 → 14 over 30s), yet it was worth around 15 points.

## 7c. Item tiers: Bronze, Silver, Gold

Buying a copy of gear you own (equipped or in the bag) upgrades it instead of adding a second one: Bronze → Silver → Gold. Trinkets don't tier.

- **Silver:** the item's numbers ×1.5: its effects, armour HP and jewellery starters. Weapons step more gently, with damage and on-hit effects ×1.15.
- **Gold:** ×2 (weapons ×1.3), and cooldown items fire 15% more often.
- **Selling:** you get half of everything paid, so Silver sells for one full price and Gold for one and a half.
- **Market:** each gear offer has a 15% chance to be a copy of something you own. Those offers say "▲ Silver" or "▲ Gold", and the inspector explains the upgrade before you buy.
- **Display:** upgraded gear has a silver or gold frame and a II or III badge, shown in the market and the battle panel. The inspector shows the scaled stats.
- **Ghosts:** they buy copies too. About 12% of their gear is upgraded by day 6, rising to about 60% by day 12 as late gold goes into upgrades.
- **Tuning (an item upgraded from Bronze on a random day-6 ghost):** Silver wins 60–63% for armour and jewellery and 74% for weapons; Gold wins 64–71% and 84%. Weapons first stepped ×1.5 and ×2 like everything else, which won 89% and 97%.
- **Balance:** with engines and tiers in play, schools land at 41–56% on days 3, 8 and 14.
- **Text:** the inspector and tooltips rewrite an upgraded item's numbers (statuses applied or gained, healing, damage, Haste and Charge times, jewellery starters, Luck, and the Gold "Every Ns") and highlight the changed ones. Multipliers such as "crits deal 2.5×" stay as written.

## 7d. Heroes

A run starts by choosing a hero. Each hero has a starting item, a passive, two schools the market leans toward, and a choice of two specialisations on day 5. Hero passives are read by the engine like items without a slot, so ghosts use the same code.

| Hero | Schools | Starts with | Passive | Day 5: one of |
|---|---|---|---|---|
| Ashen Duelist | Fire · Blood | Ember Censer | Start: gain 3 Heat, apply 1 Burn | Blood Rite (+10% Lifesteal) · Kindler (Burn cap +4, start +2 Heat) |
| Frost Warden | Frost · Holy | Frost Lantern | Enemy Freezes: gain 8 Shield | Glacier Heart (Freezes +1s) · Bastion (start 12 Shield) |
| Plague Peddler | Venom · Fortune | Lucky Coin | +3 gold at the start, +2 gold each day | Blight Ledger (Poison cap +6) · Loaded (+3 Luck) |
| Clockmaker | Desert · Lunar | Moonwell Flask | Cooldown items fire 10% faster | Hourhand (every 10s, Haste 2s) · Sandglass (start 3 Sand, 1 Regen) |
| Briar Knight | Thorn | Briar Mail | Start: gain 1 Thorns | Ironbark (+15 max HP) · Spitesteel (Thorns +1 damage) |

- **Market tilt:** each gear offer has a 35% chance to be rerolled toward the hero's schools. Other schools still show up, so a hero is a lean, not a lock.
- **Ghosts:** each ghost picks the hero that matches its main school, and 60% of the time its second school is that hero's other one. Ghosts specialise on day 5 and get the hero's gold.
- **Tuning (hero mirrors across random ghost builds):** heroes win 44–57% on day 3, 48–55% on day 8 and 45–53% on day 14; specialisations land at 41–55%. The Ashen Duelist started at 31–38% because ghosts kept its old starting Cinder Knife; the start item became Ember Censer and ghosts now replace a weaker starting weapon.
- **Exhibitions** (Hall of Fame fights) leave heroes out, so kept builds are compared on gear alone.

## 8. Bridge rings

### Jewellery starters

Every ring and amulet does something on its own. Before this, nearly every ring was a "whenever X, do Y" effect: added to a build without its school, rings scored a median 51% (no effect at all) while armour scored 67–81% from HP and weapons 98%. Now each piece of jewellery starts with a small effect from its school, shown as its first sentence. That gives it a floor, and helps it switch on its own condition.

| School | Ring | Amulet |
|---|---|---|
| Fire | Start: gain 2 Heat | Start: 1 Burn, gain 2 Heat |
| Frost | Start: apply 2 Slow | Start: 5 Frost and 2 Slow |
| Venom | Start: 1 Poison | Start: 2 Poison |
| Desert | Start: 2 Sand | Start: 3 Sand |
| Holy | Start: 5 Shield | Start: 10 Shield |
| Blood | +4% Lifesteal | +8% Lifesteal |
| Fortune | +1 Luck | +2 Luck |
| Thorn | Start: 1 Thorns | Start: 2 Thorns |
| Lunar | Start: 1 Regen | Start: 2 Regen |
| Prismatic | Start: 1 random status | Start: 1 random status |

- **Bridge rings take one school's starter, normally the first.** With both, a ring alone ran both halves of its own combo. For example, Bloodfire Ring's Lifesteal made "whenever a hit Lifesteals, apply Burn" fire on every hit, and those rings reached 82–95%.
- **Three items take their other school's starter** for the same reason: Ember Moon (Heat instead of Regen), Venomspine Ring (Poison instead of Thorns) and Phoenix Heart (Shield instead of Burn).
- **Frost uses Slow** because 2 Frost alone never Freezes anything.
- **Results (simulator, day 6, a build without the item's school):** rings 55–73% alone (median 62%, every school 57–65%), amulets 58–80% (median 70%). Schools overall still land at 39–55% on days 3, 8 and 14.



Each bridge counts toward both of its schools. Every one of the 36 school pairs has at least one bridge.

| Ring | Schools | Effect |
|---|---|---|
| **Kindling Band** | Fire · Holy | Whenever you apply Burn, heal 2. Each trigger adds +1 to the heal (max +8). Resets each fight. |
| Hearthfire Ring | Fire · Holy | Whenever you heal, gain 1 Heat (at most once per second). |
| Forgeheart Ring | Fire · Holy | Whenever you gain Heat, gain 2 Shield. |
| Frostfire Band | Fire · Frost | Whenever the enemy Freezes, double their Burn. |
| Hoarfrost Ring | Frost · Fire | Whenever you apply Slow, gain 1 Heat. |
| Witchfire Ring | Fire · Venom | Whenever Burn ticks: 50% chance to apply 1 Poison. |
| Glassblower's Ring | Fire · Desert | Whenever you apply Burn to an enemy with 5+ Sand, consume 5 Sand and deal 15 damage. |
| Bloodfire Ring | Fire · Blood | Whenever a weapon hit Lifesteals, apply 1 Burn. |
| Lucky Ember | Fire · Fortune | Burn ticks can crit. |
| Paralytic Ring | Venom · Frost | Weapon hits apply 1 Slow per 4 Poison on the enemy. |
| Scorpion Ring | Venom · Desert | Whenever an enemy attack misses, apply 3 Poison. |
| Leechmaw Ring | Venom · Holy | Heal for 30% of the Poison damage you deal. |
| Leeching Fang | Venom · Blood | Weapon hits against a Poisoned enemy have +10% Lifesteal. |
| Viper's Eye | Venom · Fortune | Poison ticks can crit. |
| Quicksand Ring | Desert · Frost | Whenever an enemy attack misses, apply 2 Slow. |
| Glacial Aegis | Frost · Holy | Whenever the enemy Freezes, gain 12 Shield. |
| Frozen Blood | Frost · Blood | +25% Lifesteal against Frozen enemies. |
| Shatter Ring | Frost · Fortune | Weapon hits on a Frozen enemy always crit. |
| Oasis Ring | Desert · Holy | Whenever an enemy attack misses, heal 4 and gain 4 Shield. |
| Duelist's Ring | Desert · Blood | Whenever an enemy attack misses, your next weapon hit has +25% Lifesteal. |
| Desert Fox Ring | Desert · Fortune | +1 Luck per 2 Sand on the enemy. |
| Crimson Bulwark | Holy · Blood | Whenever a weapon hit Lifesteals, gain 2 Shield. |
| Blessed Dice | Holy · Fortune | Your heals and Shield gains can crit. |
| Vampire's Die | Blood · Fortune | Whenever you crit, gain 2% Lifesteal for the rest of the fight (max +20%). |
| Venomspine Ring | Thorn · Venom | Whenever your Thorns trigger, apply 1 Poison. |
| Pyrebriar Ring | Thorn · Fire | Whenever your Thorns trigger, gain 1 Heat. |
| Rimespine Ring | Thorn · Frost | Whenever your Thorns trigger, apply 2 Frost. |
| Bloodbriar Ring | Thorn · Blood | Whenever your Thorns trigger, heal for half the damage they dealt. |
| Hallowed Briar | Thorn · Holy | Whenever you gain Shield, gain 1 Thorns (at most once per second). |
| Lucky Thorn | Thorn · Fortune | Your Thorns can crit. |
| Sandbriar Ring | Thorn · Desert | When an enemy attack misses you, your Thorns strike them anyway. |
| Ember Moon | Lunar · Fire | Whenever your Regen ticks, apply 1 Burn. |
| Frostmoon Band | Lunar · Frost | Whenever the enemy Freezes, gain 3 Regen. |
| Nightshade Ring | Lunar · Venom | Whenever you Cleanse, apply 2 Poison. |
| Mirage Moon | Lunar · Desert | Whenever an enemy attack misses you, gain 1 Regen. |
| Hallowed Tide | Lunar · Holy | Whenever you gain Shield, Cleanse 1 (at most once per second). |
| Bloodmoon Ring | Lunar · Blood | Whenever you Lifesteal, gain 1 Regen (at most once per second). |
| Lucky Moon | Lunar · Fortune | Your Regen ticks can crit. |
| Moonbriar | Lunar · Thorn | Whenever your Thorns trigger, gain 1 Regen. |

### Bridge legendary

| Amulet | Schools | Effect |
|---|---|---|
| **Phoenix Heart** | Fire · Holy | Burn ticks heal you for 50% of their damage. Your heals apply Burn equal to 20% of the amount healed. *(The loop shrinks each cycle, so it can't run forever.)* |

### Pair coverage

| | Frost | Venom | Desert | Holy | Blood | Fortune | Thorn | Lunar |
|---|---|---|---|---|---|---|---|---|
| **Fire** | Frostfire, Hoarfrost | Witchfire | Glassblower | Kindling, Hearthfire, Forgeheart, *Phoenix Heart* | Bloodfire | Lucky Ember | Pyrebriar | Ember Moon |
| **Frost** | | Paralytic | Quicksand | Glacial Aegis | Frozen Blood | Shatter | Rimespine | Frostmoon |
| **Venom** | | | Scorpion | Leechmaw | Leeching Fang | Viper's Eye | Venomspine | Nightshade |
| **Desert** | | | | Oasis | Duelist's | Desert Fox | Sandbriar | Mirage Moon |
| **Holy** | | | | | Crimson Bulwark | Blessed Dice | Hallowed Briar | Hallowed Tide |
| **Blood** | | | | | | Vampire's Die | Bloodbriar | Bloodmoon |
| **Fortune** | | | | | | | Lucky Thorn | Lucky Moon |
| **Thorn** | | | | | | | | Moonbriar |

Fire · Holy is the flagship pair (built around Kindling Band), so it has the most bridges.

### Synergies that need no bridge

- **Lifesteal counts as healing**, so every Holy heal payoff (Vessel, Halo, Hearthfire, Kindling's heals) also works with Blood.
- **Every school has on-crit gloves**, so Fortune pairs with every build.
- **Heat speeds up everything**, so Fire's Heat items help any build.
- **A Freeze window helps any weapon**, and **misses feed every Desert bridge**.

---

## 9. Example builds

Every loadout below is legal (10 slots, no conflicts). Resonance counts include bridges.

### 1. Pyre Saint (Fire · Holy)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Cinder Knife | Hymnal | Gilded Halo | Ember Ward | Mending Gloves | Firewalkers | Guardian's Mantle | Kindling Band, Sanctified Vessel | Phoenix Heart |

Resonance: Fire 5 (tier 4), Holy 7 (tier 6).
The knife applies Burn every second, so Kindling heals you more each time. Burn ticks heal you through Phoenix Heart, and those heals apply more Burn. Overheal becomes Shield, and Halo makes heals stronger while you're shielded.

### 2. Inferno (single-school Fire)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Cinder Knife | Ember Censer | Pyromancer's Hood | Ember Ward | Stoked Gauntlets | Firewalkers | Phoenix Cloak | Ashen Ring, Lucky Ember | Wildfire |

Resonance: Fire 10 (tier 6).
Start with 10 Heat (Firewalkers plus Fire tier 4). Crits add more Heat, and from 8 Heat Wildfire's bigger Burn cap hits 25% harder. Ashen Ring and Lucky Ember make every tick hit harder. A Shield build hard counters it.

### 3. Frostfire (Frost · Fire)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Cinder Knife | Frost Lantern | Rimecrown | Glacial Plate | Stoked Gauntlets | Snowtread Boots | Winter's Shroud | Frostfire Band, Shatter Ring | Heart of Winter |

Resonance: Frost 8 (tier 6), Fire 3 (tier 2), Fortune 1.
The knife stacks Burn while the Lantern builds Frost. Each Freeze doubles the Burn (Frostfire) and cashes in the Slow (Heart of Winter). Knife hits during the Freeze always crit (Shatter), deal +40% (Rimecrown) and apply 4 Burn each (Stoked plus Fire tier 2).

### 4. Mirage Duelist (single-school Desert)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Dune Scimitar | Sand Pouch | Nomad's Wrap | Dustveil Robe | Grit Gloves | Dust Devils | Sirocco Cloak | Oasis Ring, Quicksand Ring | Mirage |

Resonance: Desert 10 (tier 6), Holy 1, Frost 1.
Starts at 8 Sand and climbs toward 20 (80% miss chance). Each miss heals you, shields you and Slows them, and Mirage turns the miss back on the attacker. Burn and Poison builds beat it because they never miss.

### 5. Plague Doctor (Venom · Fire · Fortune)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Cinder Knife | Stinger | Gambler's Hood | Venom Carapace | Envenomed Gloves | Mire Boots | Last Bite | Witchfire Ring, Festering Ring | Coiled Serpent |

Resonance: Venom 8 (tier 6), Fire 2 (tier 2), Fortune 1.
Dual wield. The knife's Burn turns into Poison through Witchfire, and Stinger, Mire Boots and Carapace stack it further. Venom tier 6 ticks every second, so Coiled Serpent strikes every 5s for 6× the stacks, and those strikes can crit. Poison bypasses Shield, so this beats Juggernaut.

### 6. Juggernaut (single-school Holy)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Warden's Mace | Hymnal | Gilded Halo | Bastion Plate | Mending Gloves | Pilgrim's Sandals | Guardian's Mantle | Sanctified Vessel, Blessed Dice | Juggernaut's Oath |

Resonance: Holy 10 (tier 6), Fortune 1.
At full HP, the Hymnal's heals all become Shield through the Vessel. Shield gains get +50% from resonance and can crit through Blessed Dice. The Oath turns that Shield into weapon damage. Strong against Burn, weak against Poison.

### 7. Speed Thief (Blood · Frost · Fire)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Bloodletter | Winter's Bell | Vampire's Cowl | Bloodbound Mail | Bloodied Knuckles | Snowtread Boots | Blood Moon Cloak | Hoarfrost Ring, Vampire's Die | Molten Core |

Resonance: Blood 6 (tier 6), Frost 3 (tier 2), Fire 2 (tier 2), Fortune 1.
You Slow them, and every Slow you apply becomes Heat (Hoarfrost). Molten Core removes the Heat cap, so the axe keeps speeding up. Lifesteal pays Molten Core's HP cost. Sand is deadly to it: misses mean no Lifesteal, and the HP cost kills you.

### 8. Prism Chaos (Prismatic)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Prism Staff (2H) | — | Kaleidoscope Lens | Chromatic Mail | Rainbow Grips | Opalescent Boots | Prism Cloak | Fool's Opal, Witchfire Ring | Prism Heart |

Resonance: Prismatic 8, Fire 2, Venom 2 (only one Prismatic item counts toward schools).
Every status you apply brings a second random one (Prism Heart), so the enemy quickly carries all five statuses for Kaleidoscope Lens. Fool's Opal and Prismatic resonance make random amounts much larger. It's a generalist with no hard counter, and no strong matchups either.

### 9. Bramblewall (Thorn · Holy)
| Weapon | Offhand | Helm | Body | Gloves | Boots | Cape | Rings | Amulet |
|---|---|---|---|---|---|---|---|---|
| Bramble Maul (2H) | — | Bramble Crown | Ironbark Plate | Spinefist | Pilgrim's Sandals | Briar Cloak | Hallowed Briar, Bloodbriar Ring | Briarheart |

Start with 20 Shield from the sandals, and every Shield gain feeds Hallowed Briar. Each hit taken strikes back and grows Briarheart's stacks, Ironbark Plate strikes every 3s even if the enemy never attacks, and the Maul and Spinefist cash the stacks in as weapon damage. It shreds dual wielders and Heat builds, and struggles against Poison, which ignores the Shield and never hits.

### Expected matchups (hypotheses for the simulator)

Read across: the row build's expected result against the column build. W = favored, L = unfavored, = = even.

| | Pyre | Inferno | Frostfire | Mirage | Plague | Jugg | Speed |
|---|---|---|---|---|---|---|---|
| **Pyre Saint** | — | L | L | W | W | L | W |
| **Inferno** | W | — | = | W | L | L | W |
| **Frostfire** | W | = | — | L | W | L | W |
| **Mirage** | L | L | W | — | L | W | W |
| **Plague** | L | W | L | W | — | W | L |
| **Juggernaut** | W | W | W | L | L | — | L |
| **Speed Thief** | L | L | L | L | W | W | — |

Every build should have at least two good and two bad matchups. Speed Thief currently looks weakest, so it's the first candidate for tuning. If the simulator finds any build winning more than 60% of its matchups, something is broken.

---

## 10. Gems and sockets

Gems replaced scrolls, cubes and lockstones. Every piece of gear has **sockets: 1 on commons, 2 on rares and up.** Gems are the only consumables: bought from the **Jeweler** shelf, kept in the bag's **Gems** row, and set into gear by dragging a gem onto an item or by selecting it and clicking *Set into an item*.

**One gem, three effects.** What a gem does depends on the kind of item it sits in:

- **Weapon:** anything that attacks, including dual-wield offhands.
- **Armour:** helm, body, gloves, boots, cape, and offhands that don't attack.
- **Jewellery:** rings and the amulet.

So where a gem goes is the decision. A gem also counts toward its school for status picks, the way an item does.

### The gems

**School gems (common, 2 gold):**

| Gem | Weapon | Armour | Jewellery |
|---|---|---|---|
| Ember (Fire) | Every 3rd hit: 1 Burn | Every 3rd time you're hit: 1 Burn to the attacker | Burn cap +2 |
| Rime (Frost) | On hit: 2 Frost | Every 2nd time you're hit: 1 Slow to the attacker | Freezes last 1s longer |
| Viper (Venom) | Every 3rd hit: 2 Poison | Start: 2 Poison | Poison cap +4 |
| Dune (Desert) | On hit: 1 Sand | When hit: 30% chance of 1 Sand on the attacker | Start: 3 Sand |
| Halo (Holy) | On hit: heal 1 | Start: 6 Shield | Healing +15% |
| Garnet (Blood) | +6% Lifesteal on this weapon | +8 max HP | Below 50% HP: weapons deal +10% |
| Clover (Fortune) | +5% crit on this weapon | +2 Luck | On crit: +1 Luck (up to 5) |
| Briar (Thorn) | On crit: 2 Thorns | Start: 1 Thorns | Thorns deal +1 |
| Moonstone (Lunar) | First hit: 1 Regen | Start: 1 Regen | Every 3rd Regen tick: Cleanse 1 |

**Rare gems (4 gold, from day 2):**

| Gem | Weapon | Armour and jewellery |
|---|---|---|
| Echo | Every 3rd hit, the weapon's on-hit effects happen twice | The item's effects have a 50% chance to happen twice |
| Quicksilver | Attacks 6% faster | The item's cooldown is 25% shorter; without one, your weapon is 4% faster |
| Catalyst | +2 damage per different status on the enemy | Armour: +8% weapon damage per different status on you. Jewellery: all status caps +3 |

**Cursed gem (1 gold, from day 2):** **Hollow.**
- **In a weapon:** +15% damage, and its on-hit effects are 15% stronger, at −10 max HP.
- **In armour:** the item's HP and effects are 60% stronger, at −4 max HP.
- **In jewellery:** the item's effects are 60% stronger, at −3 max HP.

A cursed gem can't be taken out, only replaced.

### Rules

- **Full sockets:** a new gem replaces one you choose, and the old gem is destroyed.
- **Taking a gem out:** costs 2 gold and returns it to the Gems row.
- **Selling gear:** returns its gems to the Gems row while there's room. Cursed gems are lost.
- **Display:** gear shows its sockets as small diamond pips (filled with the gem's colour). The battle panel shows each fighter's gems next to their items.
- **Luck** doesn't affect anything about gems; it's a combat stat.

### Tuning (simulator, day 8)

- **Per gem:** one extra gem on a random item of a random build wins 46–62% against the same build without it. The jewellery effects at the bottom of that range (longer Freezes, Luck on crit, higher caps) are build-enablers, and do little for builds not aimed at them.
- **Overall:** a fully gemmed day-8 ghost (about 5 gems) beats its ungemmed twin 78% of the time.
- **Schools:** with gems on both sides, every school lands at 41–57% on days 3 / 8 / 14.

### Ghosts

Ghosts socket about 0.6 gems per day, up to their free sockets. Most are their own schools' gems, with about 25% rare gems from day 3 and the odd Hollow.

In the prototype, ghosts are generated by a shopper that spends about a player's budget (10 gold on day 1, then 9 a day, unspent gold carries). Each day it sees one plain market plus two rerolls that favour its schools. It plans around two schools (85% of ghosts; the rest go mono), counts each piece's fit, and values a school less the more of it it already wears, so builds mix rather than run a full single-school set. Bridge pieces that reach into a third school still fit. From day 3 an empty slot can take an off-school filler piece, which is the first thing it replaces. Result: about 2 items on day 1, 5.4 on day 3 (never fewer than 4), 7.7 on day 5 and 8.3 on day 8. The top school makes up 60–70% of a ghost's gear.

### The Jeweler shelf

3 gems, rerolled together with the gear offers. School gems are common; Echo, Quicksilver, Catalyst and Hollow appear from day 2. Every 3rd day the Lucky Merchant puts a rare gem in the last spot at 1 gold off.

**Retired:** scrolls, cubes, lockstones, the Golden Hammer, Shards and the Forge. Hall of Fame items kept before the change still carry their scroll steps and potential lines, shown as "Upgrades from before gems".

### Trinkets

Trinkets are once-per-fight **moments**: a clear trigger, a visible effect, and a change to the fight's tempo rather than its numbers. They read only the current fight, never grant lasting immunity, and never switch off an opponent's build.

- **Slots:** a Trinkets row under the paperdoll. One slot from the start; the second opens on day 5 (shown with a lock until then).
- **Market:** one trinket a day from day 2, at the end of the Jeweler's shelf, 6 gold. It's bought, locked and rerolled like gear.
- **Rules:** no HP, no school, no sockets. You can't wear two of the same trinket.
- **In battle:** each moment has a banner, particles and a log line: a gold statue for the Hourglass, a blue rewind ring, a tidal wave on the enemy for the Pearl, an eruption with screen shake, and a red pulse while berserk. Hits on a gilded fighter float "Immune".
- **Ghosts:** they shop the same daily offer: about 80% carry one by day 2 and nearly all carry two by day 8. Volcanic Heart mostly goes to Fire ghosts.
- **Balance:** schools still land at 42–57% on days 3, 8 and 14 with trinkets in play.

| Trinket | Effect | Win rate vs. same build without it (day 5 / 9) |
|---|---|---|
| Gilded Hourglass | Below 30% HP: gold for 2.5s. No damage at all and your Burn and Poison wait; your weapons stop, your other items keep working. | 62% / 60% |
| Chronoshard | Below 40% HP: rewind to your HP from 3s ago, up to 7% of max HP. | 62% / 58% |
| Anchor Chain | Weapons 20% slower; each hit Freezes for 1s (the 2s thaw still applies). | 62% / 62% |
| Pearl of the Deep | At 12s: the enemy's Burn, Poison, Slow and Sand double, up to their caps. | 56% / 58% (Frost 72%) |
| Volcanic Heart | Below 30% HP: spend all Heat to deal 1.5 damage per Heat and apply 1 Burn per 2 Heat. | 49% / 52% overall, 59% / 65% for Fire |
| Berserker's Totem | Below 50% HP: 5s berserk, attacking and using items 60% faster and taking 15% more damage. | 59% / 58% |
| Rainbow Prism | Each Burn, Poison or Slow you apply has a 50% chance to become a random one of the three, with 30% more stacks; each time, 30% chance you suffer 1 random one yourself. | 56% / 54% (Frost 68–72%, Thorn and Fortune 45–46%) |

First drafts were far off: Hourglass started as a net loss (41%) because standing still cost more than the hits it dodged, Chronoshard at 15% was 71%, and Anchor Chain with 1.5s Freezes hit 74% (90% for Lunar). Volcanic Heart is deliberately a Fire build-around. A random status swap always favours the school whose status is worth least per stack (Sand, then Slow) and punishes Venom: swapping all statuses put Desert or Frost at 70–89% and Venom at 13–30%. So Rainbow Prism swaps only half the time, among Burn, Poison and Slow; Frost (a meter) and Sand stay out. The additive version ("also apply a random status") already exists as the Prism Heart amulet.

## 11. Hall of Fame, exhibitions and trading

Runs end, but a player's best items shouldn't vanish. This is what gives a well-socketed item lasting value.

- **Hall of Fame:** after winning a run (10 wins), choose **one item** you finished with, equipped or in the bag, to keep. It keeps its gems.
- **Exhibition 1v1:** at any time, equip a set from your Hall of Fame (one item per slot) and fight another player's Hall of Fame avatar. No gold, lives or run progress: it's for fun and bragging rights.
- **Hall of Fame items never enter runs.** Runs stay fair for everyone, and the hall stays a collection.
- **Upgrades are stored as steps and lines, not final numbers**, so Hall of Fame items follow future balance changes automatically.
- **Fair exhibitions:** your opponent's set is trimmed to the same number of items as yours, so a three-item set meets a three-item set.

**In the prototype:** the Hall of Fame tab on the title menu shows your exhibition set (10 slots), the vault of kept items (click to add or remove, hover for upgrades), your exhibition record, and the next opponent with their gear and backdrop ("Find another" rerolls). Your title-screen character wears the exhibition set on that tab. With no server yet, opponents are generated: late-run builds with upgrades, a random look, name and backdrop. Kept items, the set and the record are saved in the browser.

**Later:**
- **Trading:** swap Hall of Fame items with other players, upgrades intact.
- **Wagers:** both players stake Hall of Fame items on an exhibition fight, and the winner takes both. Stakes should only ever be in-game items that can't be bought with real money, to stay clear of gambling rules.
- **Seasons and events:** seasonal items that join the shop pool for a limited time, event shop days with special consumables, and seasonal Hall of Fame boards. Seasonal items keep working in exhibitions after their season ends.
- **Star Force for Hall of Fame items** (possible endgame): a stepwise enhancement where each level is harder to reach and can slip back, giving collectors a long-term goal outside runs.

---

## 12. Main menu and cosmetics

The game opens on a title menu with a live, turnable preview of your character and four options: **Continue** (only while a run is in progress, with its day, wins and lives), **Start new run** (mid-run it asks for a second click before abandoning the run), **Customize character** (appearance and backdrop) and **Hall of Fame**. The right-hand side shows the **ghost leaderboard** until you open Customize or Hall of Fame. The ☰ button in the market returns to the menu.

- **Ghost leaderboard:** every time a ghost beats a player, it leaves a record: the ghost's name (ghosts are known by name), its schools, the day, and whether that loss ended the run. The board ranks ghosts by runs ended, then by players beaten, then by total wins, and shows each ghost's schools and the furthest day it was met. In the claude.ai artifact the records go to a shared store, so the board covers every player. On other hosts (GitHub Pages) it covers the runs on that device.

- **Appearance:** name (shown on your nameplate, battle panel and arena tag), skin tone, hair colour, hair style (spiky, bob, long, ponytail, bun, curly, none), eye colour and outfit colour. Equipped armour still tints the outfit during a run.
- **Backdrop:** a scene behind your character on the menu, behind you in the market, and on your half of the arena in battle (the ghost brings its own on the other half). Current set: Hearth, Ember Forge, Frost Peaks, Dune Sunset, Dawn Chapel, Starry Night, Meadow, Mire and Rose Garden, several with drifting embers, snow, petals, fireflies or twinkling stars.
- **Graphics:** dark Pixel (MapleStory-style UI) is the default look. A Graphics switch on the title menu and in the market's top bar changes to Low-poly or to the light Pixel theme. A collapsed Dev tools section holds shortcuts for testing the Hall of Fame (add a kept item, set wins to 9).
- **Cosmetics never affect stats.** They're the natural home for rewards that must stay fair: Hall of Fame milestones, seasonal backdrops and event outfits. Your Hall of Fame avatar in exhibitions shows your look and backdrop.

---

### Sound

All sound is synthesised in the browser with Web Audio (sfx.js), so there are no files to load. It starts on the first tap or key press, as browsers require.

- **Combat:** hits, crits, blocked hits, misses, Burn crackle, Poison bubbles, Freeze and thaw, heals, Shield, Thorns, Cleanse, clutch, and the fight-start drum.
- **Trinket moments:** a bell for the Hourglass, a rewind sweep, a wave for the Pearl, a boom for the eruption, a growl for berserk.
- **Sandstorm:** a looping wind that rises and falls with the storm.
- **Results:** win, loss and draw stings.
- **Market:** buying, selling, rerolling, equipping, setting and removing gems, and a buzz when you can't afford something.
- **Pacing:** each sound has a minimum gap, so 4× battles stay readable.
- **Mute:** a speaker button in the top bar (it stays visible in battle), a Sound row on the title menu, and the M key. The setting is saved in the browser.

## 13. Guardrails

These rules protect the design so balance work is about numbers, not redesigns.

1. **Fatigue** from 25s ends stall builds (Heal, Shield, Sand).
2. **Thaw** gives 2s of Frost immunity after each Freeze, so permanent lockdown is impossible.
3. **Caps:** Heat 20 (25 with Fire tier 4, none with Molten Core). Sand 15 (20 with Desert tier 6). Net speed 40%–250%. Crit chance 100%.
4. **Crit multipliers don't stack.** Use the highest one that applies (2×, 2.5× or 3×).
5. **Within a school, effects add.** Only crits, legendaries and tier-6 resonance multiply. Regular items never say "+X% Burn damage".
6. **Loops shrink each cycle or are gated** to once per second.
7. **No re-triggering.** An effect can't trigger the same item again in the same instant. Generated effects, like Prism Heart's extra status, can't trigger their own source.
8. **Bridges appear only on rings, and legendaries only in the amulet.** You get at most two bridges and one rule-changer.
9. **Only one Prismatic item counts toward school resonance.**
10. **Gems change what an item does but never add bridge effects.** A gem counts toward its school only for status picks.
11. **All scaling resets every fight.** Progression across the run comes from the shop and gems, not from permanent buffs.
12. **Deterministic resolution order**, so ghost fights replay identically.
13. **Hall of Fame items never enter runs.** They're for exhibitions, trading and wagers only.

## 14. Value reference (starting budget)

Approximate worth of one unit of each effect in damage-equivalent, used to budget items by rarity. The simulator should replace these with measured values.

| Unit | Approx. value |
|---|---|
| 1 damage | 1 |
| 1 HP healed | 0.9 |
| 1 Shield | 1 (more against Burn, 0 against Poison) |
| 1 Burn applied | 2–3 (more when stacked) |
| 1 Poison applied | 4–5 over a 20s fight (worth more early) |
| 1 Frost | about 0.15s of enemy downtime |
| 1 Slow | about 3% of enemy output for about 2s |
| 1 Sand | about 4% of enemy weapon damage while it lasts |
| 1 Heat | about 3% of your output for the rest of the fight |
| 1 Luck | about 3% weapon damage, plus chance effects |

## 15. Open questions

- **Burn's 30% healing cut** is what gives Heal a natural weakness. Is 30% the right size?
- **Luck as a universal chance stat** makes it a strong hub. It's also the stat most likely to dominate.
- **Desert tier 6 (80% miss chance)** may be too strong even with DoT as its counter. Watch it in simulation.
- **Fire · Holy has four bridges** while every other pair has one or two. Keep it as the flagship pair, or trim it?
- **Classes:** when they arrive, they could bias the shop toward schools and add a passive, without changing any item.

## 16. Next step: combat simulator

Build a headless simulator before tuning numbers:

1. Implement the keyword rules, trigger words and resolution order from sections 3–5.
2. Encode every item from sections 7–8 as data.
3. Run the 8 example builds against each other a few thousand times each, and compare against the expected matchups table.
4. Add randomly drafted builds to find unplanned combinations that win too often.
