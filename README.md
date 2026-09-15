# Nav' &amp; Yav'

A two-player, turn-based tactical battler in the spirit of **Heroes of Might &amp; Magic 3**,
set in a **Slavic dark-fantasy** world.

Send a friend a link → you both pick a castle → you each spend a gold budget recruiting
an army → the two armies fight on a hex battlefield until one side is wiped.

There is no adventure map, no hero and no spellbook. The battlefield phase is the
whole game.

## How a match runs

1. **Lobby** — one player creates a room and copies the invite link.
2. **Faction select** — each side picks from their own pool of three castles.
   The host picks from Явь (*Yav'*, the waking world); the guest picks from
   Навь (*Nav'*, the beyond).
3. **Recruitment** — each castle offers five unit types. Spend your gold.
   This is where the strategy lives: with no hero abilities to fall back on,
   what you buy *is* your plan.
4. **Battle** — initiative-ordered turns on a hex grid. Move, attack, shoot,
   wait, defend. Retaliation once per round. Last army standing wins.

## Factions

| Side | Castle | Flavour |
| --- | --- | --- |
| Явь | **Kitezh** | The sunken city's druzhina. Human steel, shield walls, discipline. |
| Явь | **Borovina** | Leshy's old forest. Wolves, wood-wights, things wearing bark. |
| Явь | **Gromoboy** | Perun's thunder-host. Fast, fragile, hits like a storm. |
| Навь | **Kostyanoy Dvor** | Koshchei's bone court. Slow, relentless, hard to finish. |
| Навь | **Topyla** | Vodyanoy's drowned mire. Rusalki, bolotniks, drag-you-under tricks. |
| Навь | **Yagaya Pushcha** | Baba Yaga's wildwood. Witches, hexes, the hut on chicken legs. |

Full stat tables live in [`docs/factions.md`](docs/factions.md).

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | oxlint |
| `npm run test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests |

Cross-device multiplayer works out of the box, no account needed: it connects the two
browsers directly over WebRTC, using a free public broker only to make the initial
introduction. For a connection that does not depend on either player's network (some
restrictive corporate/campus networks block direct peer-to-peer), copy `.env.example` to
`.env`, fill in Supabase credentials, and that real server relay is used instead whenever
it's configured.

## Architecture

```
src/
  hex/      axial coordinates, neighbours, pixel<->hex, A* pathfinding
  engine/   rule-agnostic core: seeded RNG, Result<T>, pure action reducer
  rules/    HoMM3 combat: initiative queue, retaliation, damage, victory
  content/  factions, units, battlefield dimensions, balance numbers
  net/      rooms, the sync protocol, and its transports (WebRTC, Supabase, BroadcastChannel)
  ui/       screens, battle components, theme tokens
```

Two invariants hold the whole thing together:

**Action handlers are pure and total.** Same state plus same action always produces the
same result, with no clocks, no `Math.random`, and no I/O. Every die roll goes through
the seeded RNG in `src/engine/rng.ts`, whose cursor is part of serialized state.

**Nothing outside `src/ui/theme/tokens.css` hardcodes a colour.** Every colour, spacing
step and animation duration is a custom property, so a change to the visual direction
stays in one file.

### How the two clients stay in sync

The match is **host-authoritative with verification**. The guest sends action
*requests*; the host resolves them — including every random draw — and broadcasts
`{action, rngDraws, stateHash}`. The guest replays the action using the host's draws,
then compares its own hash against the host's.

Pure lockstep determinism would also work, and would be more elegant, but it fails
*silently*: one difference in iteration order and the two players are playing subtly
different games with no indication anything is wrong. Resolving randomness once and
checksumming after every action means a desync is caught immediately and can be
reported honestly.

**Known limitation:** the host's browser is the authority, so **if the host closes their
tab, the match ends.** A guest who drops can reconnect and the host will re-send state,
but a host who drops cannot be recovered — there is no database behind this, by design.

There is also no anti-cheat, and there cannot be one without a real server. Play with
people you like.

## Deploying

Pushes to `main` deploy to Vercel automatically; other branches get preview URLs.
CI (typecheck, lint, test, build) runs on every push and pull request.
