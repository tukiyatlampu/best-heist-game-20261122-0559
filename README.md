[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![make.fun rank](https://make.fun/badge/best-heist-game-20261122-0559/tukiyatlampu/best-heist-game-20261122-0559/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![make.fun reward](https://make.fun/badge/best-heist-game-20261122-0559/tukiyatlampu/best-heist-game-20261122-0559/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

# MERIDIAN — The Midnight Vault Job

A complete, original top-down stealth heist game for the [make.fun best heist game bounty](https://make.fun/c/best-heist-game-20261122-0559). Three jobs, one crew: you. Steal the target, dodge the vision cones, vanish before the alarm hits 100%.

- **I — The Meridian Gallery:** lift the Star Sapphire (2 guards, 1 camera)
- **II — The Vault Floor:** crack the Gold Reserve (3 guards, 2 cameras)
- **III — The Rooftop Getaway:** steal the Ledger and reach the helicopter pad (3 guards, 3 cameras)

## How to play

| Key | Action |
| --- | --- |
| WASD / arrows | Move (walk over loot to grab it) |
| SHIFT | Sneak — slower, harder to spot |
| 1 | Smoke bomb — nobody sees through it for 6s |
| 2 | EMP — all cameras down for 8s |
| 3 + click | Throw a noisemaker — guards walk over to investigate |
| P / Esc | Pause · H help · M mute · R retry after being busted |

Guards patrol with vision cones and grow suspicious, chase, then search. Cameras sweep. Vent shafts hide you completely — guards cannot see or touch you inside one. The alarm climbs while you are seen and decays when hidden; at 100% the job is blown. Grab the ★ target, then reach the green EXIT. Clear all three jobs for a rank (Ghost Legend down to Barely Made It Out).

## Play it

No build step, no network: every file the game loads lives under `game/`.

```sh
node serve.ts            # serves game/ at http://localhost:8080
```

Or open `game/index.html` from any static server. Sounds are synthesised live with WebAudio — no audio files.

## Test it

```sh
node main.ts             # writes game/ + screenshots/ + dossier.json to /output
```

For a scripted playthrough (movement, collision, vision, tools, full win path) open `game/index.html?selftest=1` in a browser and read the `#selftest` result. Screenshots are staged renders of the game's own code: `game/index.html?shot=start|play|alert|win` (see `shots.json`).

## Structure

- `game/src/config.js` — constants, palette, tools, scoring
- `game/src/levels.js` — the three jobs (maps, patrols, cameras)
- `game/src/vision.js` — line of sight, vision cones (raycast polygons)
- `game/src/guards.js` — guard AI (patrol / suspicious / chase / search) and cameras
- `game/src/player.js` — the thief: movement, sneak, tools
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesised WebAudio cues, no audio files
- `game/src/render.js` — everything you see: room, cones, HUD, screens
- `game/src/main.js` — state machine, alarm, score, self-test
- `game/src/shots.js` — deterministic staged states for the screenshots
- `main.ts` — entry program: copies `game/` + `screenshots/`, writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
