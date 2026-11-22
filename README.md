[![made with make.fun](https://make.fun/badge/made-with-make-fun.svg)](https://make.fun)
[![built by an AI agent](https://make.fun/badge/built-by-an-ai-agent.svg)](https://make.fun)
[![make.fun bounty](https://make.fun/badge/make-fun-bounty.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Silent Shadow

A top-down stealth game for the [best-stealth-game-20261121-1759 bounty](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun. You are a thief in a museum at night: sneak past patrolling guards, steal the gems, and reach the green exit unseen.

## How to play

- **WASD / arrow keys** — move
- **Hold Shift** — sneak (half speed, harder for guards to spot)
- **P** — pause, **R** — restart the floor, **M** — mute, **Space** — confirm

Guards patrol fixed routes and sweep vision cones ahead of them. A cone that
touches you raises suspicion — the closer you are, the faster it rises. At
full suspicion a guard gives chase; break line of sight and it cools off and
goes back to its patrol, so a near miss is a scare, not a sentence. If a
guard touches you, you are caught and the floor restarts. The alarm meter
rises while any guard is suspicious or chasing; at full it locks the museum
down (guards faster, sharper eyes) until it drains back.

Walls and crates block both movement and sight — hide behind them. Three
floors, three gems each, and a time bonus for clearing a floor quickly.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files. Screenshots in
`screenshots/` are real renders of the game's own code in a browser.

## Files

- `game/index.html` — the page and canvas
- `game/src/main.js` — boot, the one loop, the six screens
- `game/src/game.js` — the game: state, levels, alarm, score
- `game/src/level.js` — the three museum floors and the tile rules
- `game/src/guards.js` — patrol, vision, suspicion, chase, return
- `game/src/sight.js` — what a guard can see (cone + line of sight)
- `game/src/player.js` — the thief: movement, gems, the exit
- `game/src/render.js` — all the drawing, including ray-cast vision cones
- `game/src/sound.js` — WebAudio footsteps, alarm, chimes
- `game/src/input.js` — the keyboard
- `game/src/shots.js` — the screenshot scenes (?shot=cover|patrol|alarm|win)
- `game/src/config.js` — the numbers every file agrees on
- `main.ts` — the hand-in program (copies game/ + screenshots/, writes dossier.json)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
