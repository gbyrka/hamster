import assert from "node:assert/strict";
import {
  createWheelTransition,
  advanceWheelTransition,
} from "../wheel-transition.js";
const starts = [
  { x: 6, y: 0, z: 4, angle: 0 },
  { x: 4.5, y: 0, z: 3.7, angle: 2.8 },
  { x: 7.5, y: 0, z: 3.7, angle: -2 },
  { x: 6.7, y: 0, z: 5, angle: Math.PI },
];
for (const start of starts) {
  const transition = createWheelTransition(start, true);
  assert.equal(transition.pose.x, start.x);
  assert.equal(transition.pose.z, start.z);
  let previous = start,
    pose,
    sawLift = false,
    sawTurn = false;
  for (let i = 0; i < 1800; i++) {
    pose = advanceWheelTransition(transition, 1 / 90);
    assert.ok(
      Math.hypot(
        pose.x - previous.x,
        pose.y - previous.y,
        pose.z - previous.z
      ) < 0.05,
      "no position jumps"
    );
    const da = Math.atan2(
      Math.sin(pose.angle - previous.angle),
      Math.cos(pose.angle - previous.angle)
    );
    assert.ok(Math.abs(da) < 0.15, "no heading jumps");
    assert.ok(Number.isFinite(pose.pitch));
    if (pose.z < 2.2)
      assert.ok(
        pose.z - Math.cos(pose.angle) * 0.9 > 0.8,
        "muzzle clears rear panel during entry"
      );
    sawLift ||= pose.y > 0;
    sawTurn ||= pose.turning;
    previous = pose;
    if (pose.finished) break;
  }
  assert.ok(pose.finished && sawLift && sawTurn);
  assert.ok(
    Math.abs(pose.x - 6) + Math.abs(pose.z - 1.6) + Math.abs(pose.y - 0.27) <
      1e-8
  );
  assert.ok(Math.abs(Math.cos(pose.angle)) < 1e-8 && Math.sin(pose.angle) > 0);
  const exit = createWheelTransition(pose, false);
  previous = pose;
  for (let i = 0; i < 1800; i++) {
    pose = advanceWheelTransition(exit, 1 / 90);
    assert.ok(
      Math.hypot(
        pose.x - previous.x,
        pose.y - previous.y,
        pose.z - previous.z
      ) < 0.05
    );
    previous = pose;
    if (pose.finished) break;
  }
  assert.ok(pose.finished);
  assert.ok(
    Math.abs(pose.x - 6) + Math.abs(pose.z - 4.3) + Math.abs(pose.y) < 1e-8
  );
}
console.log(
  "PASS: wheel entry from four starting positions/headings, smooth motion, rear clearance and exit"
);
