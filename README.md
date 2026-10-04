# Spin Beasts

An autobattler where you never choose what your creatures do, only the odds of what they do. Built from the Spin Beasts design brief as a single-page Three.js game.

Open `index.html` in a browser (it loads Three.js and fonts from public CDNs, so it needs a network connection). To serve it locally instead:

```sh
npx serve .
```

## How it plays

- **Market:** 10 gold a round. Buy beasts (3), Train a skill +10% (2), Empower a skill +50% (2), Teach the shop's skill scroll (3), Haste −15% timer (3), Sell (+1), Reroll (1). Buying a beast you already own levels it up, to a maximum of level 3.
- **Battle:** real time, no input. Each beast's timer ring fills, then its three-slice wheel spins and lands on a skill. Skills draw from a 20-token bag, so the odds hold but streaks stay short. Jackpot skills (10% or less) get a gold wheel, a flash and a short hit-stop. Sudden death starts at 30 seconds.
- **Run:** reach 10 wins before you lose 5 lives. Draws cost nothing.

All eleven creatures, six status effects and every passive from the brief are in. Opponents are generated with a gold budget that grows each round.

## Tuning notes

- HP values from the brief are doubled (`HP_SCALE` in `index.html`). With the original numbers, simulated fights averaged under 10 seconds, too short to enjoy the wheels. Doubled, they average about 15 seconds and roughly 5% reach sudden death.
- Freeze from several sources doesn't stack. A new freeze sets the timer pause to the longer of the two.
- Gambler Toad's Pity tokens go into the current bag only; a refill starts from the base odds again.

## Art direction

A twilight sky-island diorama: toon-shaded beasts built from primitives with inked outlines, a sea of lavender clouds, soft bloom on anything that glows, and synthesized sound.
