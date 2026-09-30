# HAMSTER — Little paws. Big adventure.

A browser-based 3D hamster game with a following camera, in the visual style of PARK / DOCK. The procedural hamster has animated paws, breathing, whiskers, fur and cheek pouches. Explore three wooden levels connected by ramps, with an exercise wheel, real-time lighting and shadows.

## Play

Open `index.html` directly in your browser. The game works through `file://`, without a server or internet connection.

Alternatively, run this inside the `hamster` directory:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. WebGL 2 is required. The included `game.bundle.js` needs no installation or CDN. Three.js 0.170.0 and its MIT license are included locally. The existing GitHub Pages workflow can publish the game without additional configuration.

## Rules

Each adventure lasts 180 seconds. There are only 8 treats available at once: three on the ground, three on the wooden loft and two on the lookout deck. Collected treats respawn in random, accessible locations on the same level. Your cheek pouches hold five treats. Points are awarded only when you eat: seeds give 10, carrots 20 and broccoli 30 points.

Hold Space for 0.85 seconds to eat **every treat in your pouches at once**. A full pouch takes the same time as a single treat, so gathering several before eating saves time. You receive the combined points and recover 12 energy per treat, up to 100. Releasing Space early cancels the bite without consuming any treats or awarding points.

Forward movement runs by default and uses energy. Hold either Shift key to walk and recover energy. Walking, resting and eating replenish energy; when energy is low, forward movement slows to walking speed. Approach the open side of the wheel and press E to enter. W / Up runs forward; S / Down runs backward. The wheel and paw animation reverse together. Hold Shift to walk more slowly in either direction. Running in either direction restores energy quickly and earns +10 seconds for every five seconds of movement, up to three bonuses per run. Leaving resets progress towards the next bonus.

| Key                   | Action                                    |
| --------------------- | ----------------------------------------- |
| W / Up                | Move forward                              |
| S / Down              | Move backward                             |
| A / D or Left / Right | Steer                                     |
| Shift                 | Walk (hold)                               |
| Space (hold)          | Eat the entire pouch / drink at the spout |
| E                     | Enter / leave the wheel                   |
| C                     | Switch camera distance                    |
| Esc                   | Pause / resume                            |

When standing still, A / D turns the hamster with small planted paw steps, mirrored for left and right. Walking or backing up while steering keeps the normal walking gait. Releasing the turn key settles the paws back into a standing pose.

The hamster smoothly adjusts its body tilt when entering or leaving a ramp. Pressing E near the wheel starts an approach from the current position, followed by a curved climb onto the tread; leaving turns the hamster towards the open front and walks it back onto the bedding. Paw steps follow the movement, and pausing freezes these transitions.

Platform support posts, the water bottle and its metal nozzle, and the sides of the in-cage tubes block the hamster’s body. Collision checks respect height: platform tops and clear space below elevated tubes remain accessible. Tube mouths stay open, and the water valve can still be reached from the front.

The game pauses automatically when the window loses focus. The last ten completed runs and your all-time best score are saved in localStorage. If storage is blocked, the game remains playable and keeps results for the current session. The interface adapts to smaller screens; gameplay requires a keyboard.

## The hideout

Walk through the arched front doorway using the usual movement keys. The hut has a real interior with soft bedding, solid side and rear walls, and enough room to turn around. The roof and front wall fade as you approach the doorway, and the camera frames the interior so the hamster stays visible. Walk or back out through the same entrance; no interaction key is needed.

## The bubble trail

Three narrow, transparent pastel tubes form one Y outside the right wall of the cage. One mouth connects directly to the second-floor lookout deck; the other two open onto the bedding. Walk into a mouth facing outwards to enter. Inside, W / Up follows the tube, Shift slows the pace, and S / Down makes the hamster stop and swivel, shortening as it turns and lengthening again through the second half of the turn. Hold Space to chew and eat your pouch inside a tube, with visible mouth and jaw movement. Turning follows the local slope of the tube and shortens the hamster without reducing its height. The paws take short alternating steps around the turn: one lifts while the other three stay planted, and the legs bend towards their contact points. Holding S turns only once; release and press again for another turn. A / D chooses the left or right route at the next fork (right by default). At a fork, the hamster follows a rounded path and turns smoothly into the chosen arm. Releasing W stops anywhere along the curve; S can turn the hamster back towards the incoming arm. Continue forward through a mouth to leave.

The camera follows from outside the plastic so the hamster stays visible, and the minimap includes all three routes. Food never spawns in the tubes or their entrances, and cannot be collected through their walls. Pausing freezes movement and the turning animation.

## Drinking

Approach the metal water spout on the right side of the habitat, facing it with your nose. Hold Space for 1.2 seconds to take a sip, earn 2 points and restore 8 energy. Drinking takes priority over eating near the spout, so your pouch stays intact. The hamster laps with its tongue and moves its muzzle, with small water droplets below the nozzle. Releasing Space early cancels the sip. Wait five seconds between rewarded sips; the prompt shows the remaining wait. The timer and cooldown pause with the game.

Food now sits on the ground without glowing rings or idle spinning. Procedural textures and geometry add striped seed husks, carrot root marks and leafy stems, and individual broccoli buds. Dense, directionally combed hairs cover the body, head and cheeks. The existing 3D strands are preserved over a generated photographic-style underfur texture, with small ears and a detailed nose. The face has shorter fur, recessed eyes with subtle catchlights, a split muzzle, a tapered nose with nostrils, a fine lip groove, an animated chin and curved whiskers that taper at the tips. The local PNG is embedded into the browser bundle so it works offline and through `file://`. See [texture generation details](assets/hamster-underfur.md).

## Edit the game

`game.js`, `world.js`, `tunnel.js`, `paws.js` and `wheel-transition.js` are source files. After editing them, rebuild the included browser script:

```sh
npm ci
npm run build
```

Publish the generated `game.bundle.js` with the game. It lets browsers load the game without requesting JavaScript modules through `file://`.

## Tests

```sh
npm test
```

Fork regression tests check all six routes at 30, 60 and 120 fps, smooth body orientation, clearance, stopping and reversing midway through a junction. World tests check all six tunnel routes, entrances and exit heights, curled turns, food exclusion, both ramps in both directions, walking under platforms, cage boundaries and 1,500 random food positions. `tests/browser.cjs` requires Playwright and Chromium. It opens `index.html` through `file://` by default. Set `HAMSTER_URL` to test an HTTP address, or `HAMSTER_BROWSER=firefox` to use Firefox.

`node tests/tunnel-browser.cjs` uses the same Playwright installation to check all three tube entrances and exits, curled turns and pausing mid-turn.

`node tests/standing-browser.cjs` checks stationary turns in both directions, stopping, pausing, and normal steering while moving forward or backward.

Browser tests cover movement, pausing, collection, eating an entire pouch, interrupted bites, water interaction and cooldown, wheel direction and bonuses, results, persistent records and responsive layout.

The MoD-IT logo is shared with the existing games and links to the same LinkedIn profile. Habitat graphics are procedural. The generated hamster underfur texture is included locally; no external models or textures are downloaded while playing.

## Collection navigation

The MoD-IT logo and the menu’s **Browse all games** link open the games collection at `../games/`. The menu footer credits Grzegorz Byrka and links to his LinkedIn profile. Publish the games as sibling paths to preserve local and GitHub Pages navigation.

## Advertising and consent

Publish `ads.css` and `monetization.js` alongside the game. One responsive `game_footer` unit sits below the complete game, separated by 150px; it does not reduce the canvas or overlay play. Google Analytics waits for Google CMP permission. Keep these two files in sync with the other projects and update their `?v=` URLs when changing them. See the sibling games README for the AdSense Consent Mode settings and root `ads.txt` deployment.
