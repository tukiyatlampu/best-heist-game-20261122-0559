# TEST RESULTS — MERIDIAN, best-heist-game-20261122-0559

Run 2026-11-22 ~15:15–16:45 WIB (deadline 2026-11-23 00:59 WIB). Every result
below is a real run on this machine, not an estimate. Commands were run by
hand; this file was written from their output, never by redirecting it.

## 1. Kit integrity

- Kit SHA-256 verified against `kit.json`: **24/24 files match**.
- Kit commands used: `node cli/makefun.mjs check --worktree --repo <package>`.

## 2. Map validation (node, `levels.js`)

- All 3 maps: **25 rows x 40 cols, exactly 1 P / 1 E / 1 T each**.
- Guard counts match the map `G` markers (2 / 3 / 3); camera counts match
  the map `K` markers (1 / 2 / 3).
- Every guard patrol segment sampled for blocking tiles: **all clear**.
- Loot counts: 6 / 4 / 7 spots + 1 target each.

## 3. Syntax + static checks

- `node --check` on all 11 `game/src/*.js` files + `main.ts` + `serve.ts`:
  **all pass, zero errors**.
- `grep` for `Math.random`, `Date.now`, `http://`, `https://` in `game/` and
  `main.ts`: **clean** (one comment mentions `Math.random` only to say the
  game never calls it). Seeded PRNG (`mulberry32`) only; no wall clock.

## 4. Headless self-test (`game/index.html?selftest=1`, Chromium headless)

Scripted playthrough using the game's real update code. **Result: PASS.**

| Phase | Result |
| --- | --- |
| moveRight | moved 165 px in 60 frames (expected ~165) — PASS |
| wallStop | x stops at 43 px, never enters the west wall — PASS |
| botRun (mission 1, stealth bot) | 7/7 loot, $8,200, target taken, screen `levelwin`, never caught, max alarm 0%, max suspicion 0.56 — PASS |
| vision | guard in open cone reaches chase; suspicion decays to 0 after hiding — PASS |
| tools | camera sees the thief, smoke blocks the sight line, EMP flag disables the camera — PASS |

## 5. Screenshots (real renders of the game's own code, `?shot=` states)

Taken with headless Chromium at 1280x800, converted to JPEG quality 82.

| File | Shot | Size |
| --- | --- | --- |
| `1-start.jpg` | title over the gallery, guards mid-patrol | 73,079 B |
| `2-play.jpg` | mid-heist: cones, loot, target, alarm 18% | 56,519 B |
| `3-alert.jpg` | vault floor, alarm 78%, guard chase, SPOTTED banner | 65,035 B |
| `4-win.jpg` | getaway screen, $21,400, rank A — MASTERMIND | 61,959 B |

All 1280x800, all under the 256 KiB cap. Each was viewed directly before
being kept: the room, guard cones, cameras, loot target and alarm meter are
all visible in one frame on the play shot.

## 6. `main.ts` determinism + clean-dir QA

- `MAKEFUN_OUTPUT_DIR=out1 node main.ts` vs `out2`: `diff -r` identical;
  aggregate sha256 of file hashes (relative paths) identical:
  `ce9177e0c8473e7af343dce003a55d7e0168f8cf8c78ac459fcdaeb9d21f5438`.
- Clean-dir QA: package copied to `/tmp/heist-clean`, `main.ts` run there —
  `dossier.json` **byte-identical** to the first run.

## 7. Gate numbers (from the `main.ts` output)

- `dossier.json`: 421,368 B (cap 1,572,864)
- `game/`: 13 files, 75,435 B (caps 993 files / 48 MiB), no symlinks
- `game/index.html`: 570 B (cap 1 MiB)
- Screenshots: 4 JPEG, 1280x800, 56–73 KiB each (cap 256 KiB)
- `/output` entries: 21 (cap 1,000)

## 8. `makefun check --worktree` (kit CLI)

- **pass**: `competition_open`, `snapshot` (21 files, 390,833 B at check
  time), `license_osi` (MIT), `entrypoint` (main.ts, node22)
- **fail**: `transcripts_present` — expected: transcripts are bundled by
  the parent at submit time; nothing here fabricates them.
- **at submission** (parent-side): `repo_public`, `repo_owner`
  (`.makefun/owner.json` present, 58 bytes), `repo_created_after_open`,
  `commit_in_repo`, `duplicate_snapshot`.

## 9. Judge score — NOT RUN (SolAPI down)

`POST /v1/responses` to SolAPI returned **HTTP 503** (third time on
2026-11-22, also at ~05:xx and ~10:xx WIB). No 2-Pass Critique score from
`gpt-6.1-sol` is claimed. In its place: a structured self-critique against
the judge's five criteria, the headless self-test above, and direct visual
review of all four screenshots.

Self-critique findings and fixes applied:

1. **HUD overflow** — the tools row ran into the timer and was clipped at
   the right edge. Fixed: tools laid out by measured width, alarm bar
   180 -> 140 px, tool label `NOISEMAKER` -> `NOISE`. Re-shot and
   re-checked the corner pixels.
2. **Thief readability** — the player read as a plain dot. Fixed: slightly
   larger figure + a gold loot sack appears once loot is carried.
3. **Self-test bot** — the first bot stopped 1–2 px short of loot (arrival
   radius 26 px vs pickup radius 24 px), then walked into patrols.
   Fixed: arrival radius 18 px, patrol-corridor-avoiding BFS routing,
   vent retreats. Final bot run: 7/7 loot, never caught.
4. **Vents are real cover** — a guard touching the player inside a vent no
   longer busts the mission (vents hide completely, as the help text says).

## 10. Checklist vs the bounty

- [x] Complete heist game, keyboard + mouse, offline static files
- [x] Room + guards with vision cones + cameras + loot target + alarm
      meter visible in one frame (screenshot 2)
- [x] Original idea, art, sounds, names (Meridian, Star Sapphire, Ledger)
- [x] 3 missions, several routes (open halls, side corridors, vents),
      tools at a cost (limited counts), patrols to read
- [x] HUD, tutorial/help, pause, busted / level-win / getaway screens
- [x] `main.ts` (Node 22 stdlib) + `vendor/makefun-game.ts` unchanged
      (SHA matches the kit)
- [x] 3–4 screenshots, real renders, first by name is the cover
- [x] LICENSE MIT (SPDX line 1), `.makefun/owner.json` (58 bytes)
- [x] Deterministic `main.ts` (2 runs + clean-dir, byte-identical)
- [ ] Transcripts bundle + GitHub push + submit — **parent's step**
