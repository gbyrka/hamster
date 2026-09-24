import assert from 'node:assert/strict';
import { moveTo, supports, waterFixture } from '../world.js';
import { tunnelPaths, tunnelPose, tunnelEntry } from '../tunnel.js';

// Walk directly into every support, on both the bedding and intermediate floor.
for (const support of supports) for (const y of [0, 3]) {
  if (y >= support.to[1]) continue;
  const [x,, z] = support.from;
  // The inside of the cage always provides room on this side of the post.
  const direction = x < 0 ? -1 : 1;
  let p = { x: x - direction * 1.6, z, y };
  for (let i = 0; i < 120; i++) {
    p = moveTo(p.x + direction * 0.025, p.z, y, -direction * Math.PI / 2);
    for (const offset of [-0.35, 0.3]) assert.ok(
      Math.hypot(p.x + direction * offset - x, p.z - z) >= 0.599,
      'both ends of the body stay outside support posts, including while sliding');
  }
  const top = moveTo(x, z, support.to[1]);
  assert.ok(Math.abs(top.x - x) < 1e-8, 'support does not block the top of its own platform');
  assert.ok(Math.abs(top.z - z) < 1e-8);
}
// The open space under a deck remains walkable.
let under = { x: -8, z: -3 };
for (let i = 0; i < 100; i++) under = moveTo(under.x + 0.025, under.z, 0, -Math.PI / 2);
assert.ok(under.x > -5.6);
assert.equal(under.y, 0);

// Crossing the metal nozzle from either side must stop before touching it.
for (const side of [-1, 1]) {
  let p = { x: 8.9, z: 5.8 + side * 1.6 };
  for (let i = 0; i < 120; i++) {
    p = moveTo(p.x, p.z - side * 0.025, 0, side > 0 ? 0 : Math.PI);
    for (const offset of [-0.35, 0.3]) {
      const closestX = Math.max(8.65, Math.min(9.05, p.x));
      assert.ok(Math.hypot(p.x - closestX, p.z - side * offset - 5.8) >= 0.534,
        'the body cannot cross the low metal nozzle from either side');
    }
  }
}
let drink = { x: 6.8, z: waterFixture.spout[2] };
for (let i = 0; i < 100; i++) drink = moveTo(drink.x + 0.025, drink.z, 0, -Math.PI / 2);
assert.ok(Math.hypot(drink.x + 0.85 - waterFixture.spout[0], drink.z - waterFixture.spout[2]) < 0.32, 'ball valve remains reachable by the nose');
const lapping = moveTo(waterFixture.spout[0] - 0.85, waterFixture.spout[2], 0, -Math.PI / 2);
assert.ok(Math.abs(lapping.x - (waterFixture.spout[0] - 0.85)) < 1e-8, 'drinking animation target is not inside a collider');

for (let branch = 0; branch < 3; branch++) {
  const mouth = tunnelPose(branch, 0);
  for (const side of [-1, 1]) {
    let p = { x: 10, z: mouth.z + side * 1.7 };
    for (let i = 0; i < 140; i++) p = moveTo(p.x, p.z - side * 0.025, mouth.y, side > 0 ? 0 : Math.PI);
    assert.ok((p.z - mouth.z) * side > 1.25, 'tube walls prevent entry from either side');
  }
  let p = { x: mouth.x - 1.6, z: mouth.z, y: mouth.y };
  let entered = -1;
  for (let i = 0; i < 100; i++) {
    entered = tunnelEntry(p.x, p.y, p.z, mouth.angle);
    if (entered >= 0) break;
    p = moveTo(p.x + 0.025, p.z, mouth.y, mouth.angle);
  }
  assert.equal(entered, branch, 'open mouth remains accessible from the correct floor');
}
// The elevated tube must not form an invisible wall on the bedding below it.
let below = { x: 9, z: -5.6 };
for (let i = 0; i < 120; i++) below = moveTo(below.x, below.z + 0.025, 0, Math.PI);
assert.ok(below.z > -3, 'can pass below the elevated tube');
console.log('PASS: support posts on multiple floors, clear platform tops/underpasses, nozzle side collisions, reachable drinking position, tube side walls and all open mouths');
