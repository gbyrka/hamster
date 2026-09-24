import assert from "node:assert/strict";
import {
  floorAt,
  moveTo,
  foodSpot,
  decks,
  ramps,
  inside,
  obstacles,
  house,
  inHouse,
} from "../world.js";
let y = 0;
for (let z = 7; z >= 0.9; z -= 0.025) y = floorAt(-6.5, z, y);
assert.equal(y, 3, "first ramp connects ground to first deck");
for (let z = 0.9; z >= -6; z -= 0.025) y = floorAt(-6.5, z, y);
for (let x = -6.5; x <= 5; x += 0.025) y = floorAt(x, -6, y);
assert.equal(y, 6, "second ramp connects first deck to upper deck");
for (let x = 5; x >= -6.5; x -= 0.025) y = floorAt(x, -6, y);
assert.equal(y, 3, "can descend second ramp");
for (let z = -6; z <= 7.1; z += 0.025) y = floorAt(-6.5, z, y);
assert.equal(y, 0, "can descend first ramp");
assert.equal(floorAt(-9, -3, 0), 0, "can walk below platforms");
assert.equal(moveTo(99, 99, 0).x, 10.5, "cage boundaries contain hamster");
let hutPosition = { x: -1, z: -4, y: 0 };
for (let i = 0; i < 80; i++)
  hutPosition = moveTo(hutPosition.x, hutPosition.z - 0.025, 0);
assert.ok(
  inHouse(hutPosition.x, hutPosition.z),
  "walk through the open doorway"
);
for (let i = 0; i < 100; i++)
  hutPosition = moveTo(hutPosition.x, hutPosition.z - 0.025, 0);
assert.ok(hutPosition.z > house.z1 + 0.7, "rear wall blocks the muzzle");
for (let i = 0; i < 160; i++)
  hutPosition = moveTo(hutPosition.x, hutPosition.z + 0.025, 0);
assert.ok(hutPosition.z > house.z2 + 0.5, "back out through doorway");
for (const x of [-2.15, 0.15]) {
  let p = { x, z: -3.8 };
  for (let i = 0; i < 150; i++) p = moveTo(p.x, p.z - 0.025, 0);
  assert.ok(p.z > house.z2, "solid front sections block entry");
}
for (const direction of [-1, 1]) {
  let p = { x: -1, z: -6 };
  for (let i = 0; i < 120; i++)
    p = moveTo(p.x + direction * 0.025, p.z, 0, (-direction * Math.PI) / 2);
  assert.ok(
    p.x > house.x1 + 0.7 && p.x < house.x2 - 0.7,
    "side walls contain a turning hamster"
  );
}
assert.ok(!inHouse(-1, -6, 3), "upper ramp is not inside hut");
for (let level = 0; level < 3; level++)
  for (let i = 0; i < 500; i++) {
    const p = foodSpot(level);
    assert.equal(p.y, level * 3);
    if (level) assert.ok(inside(decks[level - 1], p.x, p.z));
    else {
      assert.ok(
        !inside(house, p.x, p.z, 0.7),
        "food does not spawn inside hut walls"
      );
      assert.ok(!ramps.some((r) => inside(r, p.x, p.z, 0.5)));
      assert.ok(!decks.some((d) => inside(d, p.x, p.z, 0.5)));
      assert.ok(
        !obstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.r + 1)
      );
    }
  }
console.log(
  "PASS: ramp ascent and descent, underpasses, hut entry/exit/walls, boundaries, 1,500 reachable food positions"
);

// Every entrance must reach both other exits; the tube is a connected Y.
const {
  tunnelPaths,
  tunnelPose,
  tunnelEntry,
  tunnelBranch,
  stepTunnel,
  nearTunnel,
} = await import("../tunnel.js");
assert.equal(tunnelPaths.length, 3);
assert.deepEqual(
  tunnelPaths.map((p) => p.points[0].y),
  [6, 0, 0]
);
for (let branch = 0; branch < 3; branch++) {
  const start = tunnelPose(branch, 0);
  assert.equal(tunnelEntry(start.x, start.y, start.z, start.angle), branch);
  assert.equal(
    tunnelEntry(start.x, start.y, start.z, start.angle + Math.PI),
    -1
  );
  assert.equal(tunnelEntry(start.x, start.y + 3, start.z, start.angle), -1);
  const end = tunnelPose(branch, tunnelPaths[branch].length);
  assert.deepEqual([end.x, end.y, end.z], [15, 0, 0]);
  const outside = tunnelPaths[branch].points.filter((p) => p.x > 11.2);
  assert.ok(
    outside.length > tunnelPaths[branch].points.length * 0.6,
    "most of tube outside cage"
  );
  const destinations = new Set();
  for (const steer of [-1, 1]) {
    const tube = { branch, s: 0, direction: 1 };
    let pose;
    for (let i = 0; i < 2000; i++) {
      pose = stepTunnel(tube, 1 / 60, 1, steer);
      assert.ok(Number.isFinite(pose.x + pose.y + pose.z));
      if (pose.exited) break;
    }
    assert.ok(pose.exited, "walk all the way out");
    assert.notEqual(tube.branch, branch);
    destinations.add(tube.branch);
    assert.equal(
      pose.y,
      tube.branch === 0 ? 6 : 0,
      "exit lands at matching floor"
    );
  }
  assert.equal(destinations.size, 2, "left and right reach distinct exits");
  const tube = { branch, s: 2, direction: 1 };
  const tucked = stepTunnel(tube, 0.5, -1, 0);
  assert.ok(
    tucked.curl > 0.9,
    "hamster is shortened near the middle of its turn"
  );
  assert.equal(tube.s, 2, "turn does not move through wall");
  for (let i = 0; i < 120; i++) stepTunnel(tube, 1 / 60, -1, 0);
  assert.equal(tube.direction, -1, "held reverse performs only one turn");
  assert.equal(tube.turn, null);
  stepTunnel(tube, 0.1, 1, 0);
  assert.ok(tube.s < 2, "forward now goes back towards entrance");
}
for (let level = 0; level < 3; level++)
  for (let i = 0; i < 1000; i++) {
    const p = foodSpot(level);
    assert.ok(
      !nearTunnel(p.x, p.y, p.z, 1.15),
      "food never appears in a tube or its mouth"
    );
  }
console.log(
  "PASS: three tube entrances, all six routes, floor connections, curled turns, no tube food"
);

const { tunnelOrientation } = await import("../tunnel.js");
const { Quaternion, Vector3 } = await import("../vendor/three.module.js");
for (const fraction of [0.4, 0.65, 0.8]) {
  const s = tunnelPaths[0].length * fraction;
  const base = tunnelPose(0, s);
  const normal = new Vector3(...tunnelOrientation(0, s, base.angle).up);
  for (let turn = 0; turn <= Math.PI * 2; turn += Math.PI / 16) {
    const frame = tunnelOrientation(0, s, base.angle + turn);
    const q = new Quaternion().fromArray(frame.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const forward = new Vector3(0, 0, -1).applyQuaternion(q);
    assert.ok(
      up.distanceTo(normal) < 1e-10,
      "slope turn preserves tube floor normal"
    );
    assert.ok(
      Math.abs(forward.dot(normal)) < 1e-10,
      "hamster turns parallel to inclined tube floor"
    );
    assert.ok(Math.abs(q.length() - 1) < 1e-10);
  }
  const forward = new Vector3(0, 0, -1).applyQuaternion(
    new Quaternion().fromArray(tunnelOrientation(0, s, base.angle).quaternion)
  );
  const backward = new Vector3(0, 0, -1).applyQuaternion(
    new Quaternion().fromArray(
      tunnelOrientation(0, s, base.angle + Math.PI).quaternion
    )
  );
  assert.ok(
    forward.clone().add(backward).length() < 1e-10,
    "completed turn faces back along same slope"
  );
}
console.log(
  "PASS: slope turns maintain a constant floor normal throughout both directions"
);

const { tunnelTurnPaw } = await import("../tunnel.js");
const floorPaw = (i, p) => {
  const foot = tunnelTurnPaw(i, p),
    a = Math.PI * p;
  return new Vector3(
    Math.cos(a) * foot.x + Math.sin(a) * foot.z,
    foot.y,
    -Math.sin(a) * foot.x + Math.cos(a) * foot.z
  );
};
for (let n = 0; n <= 240; n++) {
  const p = n / 240;
  const paws = [0, 1, 2, 3].map((i) => tunnelTurnPaw(i, p));
  assert.ok(
    paws.filter((foot) => foot.lift > 1e-8).length <= 1,
    "at least three paws support the turn"
  );
  assert.ok(
    paws.every((foot) => foot.y >= 0.125 && foot.y <= 0.235 + 1e-10),
    "swing clears the floor without kicking too high"
  );
}
for (let i = 0; i < 4; i++) {
  const start = tunnelTurnPaw(i, 0),
    end = tunnelTurnPaw(i, 1);
  assert.ok(
    Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z) < 1e-10,
    "last step restores normal stance"
  );
  for (let n = 1; n < 100; n++) {
    const p = n / 100,
      later = p + 0.001;
    if (tunnelTurnPaw(i, p).lift === 0 && tunnelTurnPaw(i, later).lift === 0)
      assert.ok(
        floorPaw(i, p).distanceTo(floorPaw(i, later)) < 1e-10,
        "planted paw does not slide during body rotation"
      );
  }
}
console.log("PASS: turn paw support, lift, planted contacts and final stance");

const { standingTurnPaw } = await import("../paws.js");
for (let n = 0; n < 720; n++) {
  const angle = (n * Math.PI) / 180;
  for (const direction of [-1, 1]) {
    const paws = [0, 1, 2, 3].map((i) => standingTurnPaw(i, angle, direction));
    assert.ok(
      paws.filter((p) => p.lift > 1e-8).length <= 1,
      "stationary pivot keeps three paws planted"
    );
    for (let i = 0; i < 4; i++) {
      const p = paws[i],
        mirrored = standingTurnPaw(i ^ 1, angle, -direction);
      assert.ok(
        Math.abs(p.x + mirrored.x) +
          Math.abs(p.z - mirrored.z) +
          Math.abs(p.y - mirrored.y) <
          1e-10,
        "left and right turns mirror the paw steps"
      );
      const later = standingTurnPaw(i, angle + 0.001, direction);
      if (p.lift === 0 && later.lift === 0) {
        const anchor = new Vector3(p.x, p.y, p.z).applyAxisAngle(
          new Vector3(0, 1, 0),
          direction * angle
        );
        const nextAnchor = new Vector3(
          later.x,
          later.y,
          later.z
        ).applyAxisAngle(new Vector3(0, 1, 0), direction * (angle + 0.001));
        assert.ok(
          anchor.distanceTo(nextAnchor) < 1e-10,
          "stationary turn does not slide planted paws"
        );
      }
    }
  }
}
console.log(
  "PASS: continuous stationary pivots, left/right symmetry and fixed paw contacts"
);

const { surfaceNormal, rampHeight } = await import("../world.js");
for (const ramp of ramps) {
  const x = (ramp.x1 + ramp.x2) / 2,
    z = (ramp.z1 + ramp.z2) / 2;
  const y = rampHeight(ramp, x, z);
  const normal = surfaceNormal(x, z, y);
  assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-10);
  const dx = ramp.axis === "x" ? 0.01 : 0,
    dz = ramp.axis === "z" ? 0.01 : 0;
  const dy = rampHeight(ramp, x + dx, z + dz) - y;
  assert.ok(
    Math.abs(dx * normal.x + dy * normal.y + dz * normal.z) < 1e-10,
    "body up is perpendicular to actual ramp slope"
  );
  assert.deepEqual(
    surfaceNormal(x, z, 0),
    { x: 0, y: 1, z: 0 },
    "walking under a ramp stays upright"
  );
  assert.deepEqual(
    surfaceNormal(x, z, y + 1),
    { x: 0, y: 1, z: 0 },
    "airborne hamster does not follow ramp underneath"
  );
}
assert.deepEqual(
  surfaceNormal(7, -4, 6),
  { x: 0, y: 1, z: 0 },
  "level platform stays upright"
);
console.log(
  "PASS: ramp surface normals, level decks, underpasses and airborne positions"
);
