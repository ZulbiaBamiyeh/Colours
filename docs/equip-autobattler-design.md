# Equip Autobattler: Design Doc

*Working title: TBD. All numbers are starting values for the simulator, not final balance.*

## 1. Pitch

An autobattler in the spirit of Backpack Battles, without the backpack. Instead of fitting shapes into a grid, you fill an RPG-style equipment screen (RuneScape / MapleStory). Each day you visit a shop, buy and upgrade gear, then fight another player's build from the same day automatically.

The depth comes from three layers:

1. **Keywords** (Burn, Frost, Sand, ...) with simple rules that counter each other.
2. **Slots** that decide *how* an item triggers, while its **school** decides *what* it does. Every school can fill every slot, so you can stack one school or combine two.
3. **Bridges and legendaries** that connect schools into a web of builds, plus scrolls and cubes for gambling on upgrades.

## 2. Run structure (proposed)

| Element | Rule |
|---|---|
| Goal | Reach **10 wins** before losing **5 lives**. Draws cost nothing. |
| Day | Shop phase, then one fight. |
| Opponent | An asynchronous ghost: a snapshot of another player's build from the same day number. |
| Gold | 10 per day. Unspent gold carries over. |
| Shop | 5 gear offers plus 3 Enchanter offers (scrolls and cubes). Reroll 1 gold rerolls both shelves. Lock gear offers between days. Sell items for 50%, plus 1 gold per successful scroll. |
| Lucky Merchant | Every 3rd day, one Enchanter offer is a guaranteed rare consumable (Chaos Scroll, Mirror Cube or Golden Hammer) at 1 gold off. |
| Bag | Two tabs. **Equip:** 6 slots for items you're holding (a bench, not a build slot). **Use:** 6 slots for scrolls and cubes, stacking up to 9 of each. |
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
| Fatigue | From 25s, both fighters take 1 damage per second, rising by 1 each second. Fatigue ignores Shield. |
| Draw | If both fighters die on the same tick, the fight is a draw. |

**Resolution order each tick:** Burn ticks, then Poison ticks, then weapons and cooldowns fire (weapon, then offhand, then the other slots top to bottom), then reactions resolve. A fixed order keeps fights deterministic, so ghosts replay identically.

## 4. Keywords

| Keyword | Affects | Rule |
|---|---|---|
| **Burn** | enemy | Deals its stacks as damage per second, dealt continuously, and loses 1 stack each second. Damages Shield first. **A burning fighter receives less healing.** |
| **Poison** | enemy | Deals its stacks as damage every 3s, dealt continuously (1/3 of the stacks per second). Never decays. **Bypasses Shield.** |

*Continuous damage, tick effects:* Burn and Poison drain HP smoothly at their advertised rate, but "whenever Burn ticks" (every 1s) and "whenever Poison ticks" (every 3s) still happen on that schedule. A tick that crits repeats the damage dealt since the last tick, and tick effects like Phoenix Heart and Leechmaw Ring use that amount. Coiled Serpent stops the drain and strikes on every 5th Poison tick instead.
| **Frost** | enemy | At 10 stacks the enemy is **Frozen** for 1.5s: weapon and cooldowns pause (statuses still tick). Frost then resets to 0, and the enemy **Thaws** for 2s, during which it can't gain Frost. |
| **Slow** | enemy | −3% speed per stack. Loses 1 stack every 2s. **Slow and Heat on the same fighter cancel 1:1.** |
| **Sand** | enemy | −4% weapon accuracy per stack, up to 15 stacks (60% miss chance). Loses 1 stack every 2s. Affects weapon attacks only, including dual-wield offhands. **A missed attack triggers nothing.** |
| **Shield** | you | Absorbs damage before HP. Doesn't decay. |
| **Heal** | you | Restores HP up to your max. Healing beyond max is **overheal** and is lost unless an item uses it. **Lifesteal counts as healing.** |
| **Lifesteal** | you | Heals you for a percentage of the weapon damage you deal, including damage to Shield. |
| **Luck** | you | +3% crit chance per stack, **and +3 percentage points to every other chance-based effect.** |
| **Heat** | you | +3% speed per stack, up to 20 stacks. Doesn't decay. |
| **Thorns** | you | Whenever an enemy weapon hit lands on you, deal damage equal to your Thorns to the attacker. Up to 20 stacks. Doesn't decay. **Misses don't trigger it.** Thorns damage hits Shield first, isn't a weapon hit (so it never triggers on-hit or when-hit effects, and two Thorns fighters can't loop), and counts as "Thorns triggering" for items. |
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
| Amulet | Wildfire | L | While you have 15+ Heat, Burn on the enemy doesn't decay. |
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
| Helm | Nomad's Wrap | R | While the enemy has 10+ Sand, their Sand doesn't decay. |
| Body | Dustveil Robe | C | When hit: apply 3 Sand to the attacker. |
| Gloves | Grit Gloves | R | On crit: apply 4 Sand. |
| Boots | Dust Devils | C | Start of fight: apply 8 Sand. |
| Cape | Sirocco Cloak | E | Clutch: set the enemy's Sand to its cap. It doesn't decay for 5s. |
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

### Prismatic (random)

Random statuses are drawn from Burn, Poison, Frost, Slow and Sand. Random boons are drawn from heal 8, 8 Shield, 2 Heat, 2 Luck, +3% Lifesteal and 2 Thorns. **Weighting:** each option's weight is 1 + the number of non-Prismatic items you're wearing from that option's school.

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

## 8. Bridge rings

Each bridge counts toward both of its schools. Every one of the 28 school pairs has at least one bridge.

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

### Bridge legendary

| Amulet | Schools | Effect |
|---|---|---|
| **Phoenix Heart** | Fire · Holy | Burn ticks heal you for 50% of their damage. Your heals apply Burn equal to 20% of the amount healed. *(The loop shrinks each cycle, so it can't run forever.)* |

### Pair coverage

| | Frost | Venom | Desert | Holy | Blood | Fortune | Thorn |
|---|---|---|---|---|---|---|---|
| **Fire** | Frostfire, Hoarfrost | Witchfire | Glassblower | Kindling, Hearthfire, Forgeheart, *Phoenix Heart* | Bloodfire | Lucky Ember | Pyrebriar |
| **Frost** | | Paralytic | Quicksand | Glacial Aegis | Frozen Blood | Shatter | Rimespine |
| **Venom** | | | Scorpion | Leechmaw | Leeching Fang | Viper's Eye | Venomspine |
| **Desert** | | | | Oasis | Duelist's | Desert Fox | Sandbriar |
| **Holy** | | | | | Crimson Bulwark | Blessed Dice | Hallowed Briar |
| **Blood** | | | | | | Vampire's Die | Bloodbriar |
| **Fortune** | | | | | | | Lucky Thorn |

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
Start with 10 Heat (Firewalkers plus Fire tier 4). Crits add more Heat, and at 15 Wildfire stops Burn from decaying. Ashen Ring and Lucky Ember make every tick hit harder. A Shield build hard counters it.

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

## 10. Scrolls, cubes and the Use tab

Upgrades are consumables bought from the **Enchanter** shelf and kept in the bag's **Use** tab. Drag one onto any item, in the bag or equipped, or select it and click Use, then pick the item. A window shows the odds and possible results before you confirm.

### Scrolls: stats, with risk

Every item has **upgrade slots by rarity: Common 2, Rare 3, Epic 4, Legendary 3.** Each scroll attempt uses a slot whether it works or not. Successful steps show as a **+N** badge on the item.

**What a scroll improves depends on the slot.** You choose which of the two stats when you apply it:

| Slot | Stat | One step |
|---|---|---|
| Weapon, dual-wield offhand | Attack | +6% of the weapon's base damage |
| | Haste | −3% attack time |
| Other offhands | Focus | −4% cooldown |
| | Vitality | +5 HP |
| Helm, body, gloves, boots, cape | Vitality | +5 HP |
| | Ward | Start each fight with +4 Shield |
| Ring, amulet | Fortune | +1 Luck |
| | Leech | +1.5% Lifesteal |

| Scroll | Odds | On success | On failure | Price |
|---|---|---|---|---|
| Blessed Scroll | 100% | +1 step | – | 2 |
| Scroll | 60% | +2 steps | Slot used | 3 |
| Dark Scroll | 30% | +5 steps | Slot used, and 50% chance the item is destroyed | 4 |
| Chaos Scroll | 60% | Both of the item's stats change by −2 to +4 steps | Slot used | 5 |
| Golden Hammer | 100% | +1 upgrade slot (once per item, uses no slot) | – | 6 |

- **Bad-luck protection:** each failed scroll on an item adds +5% to that item's next attempt.
- **Shards:** a destroyed item leaves a Shard. 3 Shards forge a legendary: choose 1 of 3.
- **Luck doesn't affect scroll or cube rolls.** Luck is a combat stat.
- There is deliberately no protection scroll and no slot recovery. Risk is the point, and the Dark Scroll is the only way to lose an item.

### Cubes: potential lines

An item has a **potential tier** with lines: Rare (1 line), Epic (2), Unique (3), Legendary (3, strongest values). A new item has no potential; the first cube gives it Rare.

| Cube | Effect | Price |
|---|---|---|
| Plain Cube | Rerolls all lines. The tier never rises. | 3 |
| Bright Cube | Rerolls, with a chance to raise the tier: Rare→Epic 10%, Epic→Unique 6%, Unique→Legendary 3%. | 5 |
| Mirror Cube | Works like a Bright Cube, then shows old and new lines side by side and you keep either set. | 7 |
| Lockstone | When cubing, tick a line to lock: it stays through the reroll and one Lockstone is used. | 3 |

**Line pools** (values at Rare / Epic / Unique / Legendary). Lines are stats and status sources only. They never add a school tag, never contain rule text and never act as bridges.

| Family | Lines |
|---|---|
| Weapon | Weapon damage +4/7/10/14% · Attack time −3/5/7/10% · Lifesteal +2/3/5/7% · Luck +1/2/3/4 · On hit: apply 1/1/2 of a status (Epic and up) |
| Armour | HP +8/12/18/25 · Start with Shield 6/10/15/22 · Start with Heat 2/3/4 (Epic and up) · Clutch: gain Shield 10/15/22 (Epic and up) · Luck +1/1/2/3 · Start with Thorns 2/3/4/6 |
| Offhand | Cooldown −4/6/9/12% · HP +6/10/14/20 · Start with Shield 5/8/12/18 · Luck +1/2/2/3 |
| Accessory | Luck +1/2/3/4 · Lifesteal +2/3/4/6% · HP +6/10/14/20 · Start with Heat 1/2/3/4 · Start: apply Slow 2/3/4/6 · Start: apply Sand 3/4/6 (Epic and up) |

**Caps across all items:** weapon damage +30%, attack time −25%, cooldown −25%. The jackpot is a source line like "On hit: apply 2 Burn" on a non-Fire weapon, which lets a build borrow a status without a bridge ring.

### Ghosts upgrade too

Ghost builds get scroll steps and potential tiers that scale with the day, so they keep pace with what players invest.

### The Enchanter shelf

3 offers, rerolled together with the gear offers. Blessed Scrolls, Scrolls, Plain Cubes and Lockstones are common; Dark Scrolls and Bright Cubes uncommon; Chaos Scrolls, Mirror Cubes and Golden Hammers rare and only from Day 3.

## 11. Hall of Fame, exhibitions and trading

Runs end, but a player's best items shouldn't vanish. This is what gives scroll and cube results lasting value.

- **Hall of Fame:** after winning a run (10 wins), choose **one item** you finished with, equipped or in the bag, to keep. It keeps its scroll steps and potential lines.
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

The game opens on a title menu with a live, turnable preview of your character, Play (or Continue run and New run), and two tabs: **Character** (appearance and backdrop) and **Hall of Fame**. The ☰ button in the market returns to it.

- **Appearance:** name (shown on your nameplate, battle panel and arena tag), skin tone, hair colour, hair style (spiky, bob, long, ponytail, bun, curly, none), eye colour and outfit colour. Equipped armour still tints the outfit during a run.
- **Backdrop:** a scene behind your character on the menu, behind you in the market, and on your half of the arena in battle (the ghost brings its own on the other half). Current set: Hearth, Ember Forge, Frost Peaks, Dune Sunset, Dawn Chapel, Starry Night, Meadow, Mire and Rose Garden, several with drifting embers, snow, petals, fireflies or twinkling stars.
- **Graphics:** dark Pixel (MapleStory-style UI) is the default look. A Graphics switch on the title menu and in the market's top bar changes to Low-poly or to the light Pixel theme. A collapsed Dev tools section holds shortcuts for testing the Hall of Fame (add a kept item, set wins to 9).
- **Cosmetics never affect stats.** They're the natural home for rewards that must stay fair: Hall of Fame milestones, seasonal backdrops and event outfits. Your Hall of Fame avatar in exhibitions shows your look and backdrop.

---

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
10. **Scroll and cube lines are stats and sources only**, and never add school tags.
11. **All scaling resets every fight.** Progression across the run comes from the shop, scrolls and cubes, not from permanent buffs.
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
