import assert from 'node:assert/strict';
import { tunnelPaths, tunnelPose, tunnelTravelPose, tunnelOrientation, stepTunnel } from '../tunnel.js';
import { Quaternion } from '../vendor/three.module.js';

function orientation(tube, pose) {
  return new Quaternion().fromArray(tunnelOrientation(tube.branch, tube.s, pose.angle, tunnelTravelPose(tube, 1)).quaternion);
}
for (const fps of [30, 60, 120]) for (const walk of [false, true]) {
  for (let branch = 0; branch < 3; branch++) for (const steer of [-1, 1]) {
    const tube = { branch, s: tunnelPaths[branch].length - 1.2, direction: 1 };
    let previous = tunnelTravelPose(tube), rotation = orientation(tube, previous), forkFrames = 0;
    for (let frame = 0; frame < fps * 4; frame++) {
      const pose = stepTunnel(tube, 1 / fps, 1, steer, walk);
      const nextRotation = orientation(tube, pose);
      assert.ok(Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z) <= (walk ? 1.35 : 2.5) / fps + 1e-6, 'constant travel speed without position jumps');
      assert.ok(rotation.angleTo(nextRotation) < 6 / fps, 'no instantaneous body rotation at either end of the fork');
      if (tube.fork) {
        forkFrames++;
        const clearance = Math.min(...tunnelPaths.flatMap(path => path.points.map(p => Math.hypot(p.x - pose.x, p.y - pose.y, p.z - pose.z))));
        assert.ok(clearance < 0.4, 'rounded path stays inside the overlapping tube walls');
      }
      previous = pose; rotation = nextRotation;
      if (tube.branch !== branch) break;
    }
    assert.ok(forkFrames > fps * 0.25, 'turn unfolds across multiple frames');
    assert.notEqual(tube.branch, branch, 'reaches selected outgoing branch');
    assert.equal(tube.direction, -1);
  }
}
for (let branch = 0; branch < 3; branch++) for (const steer of [-1, 1]) {
  const tube = { branch, s: tunnelPaths[branch].length - 1, direction: 1 };
  while (!tube.fork || tube.fork.s < tube.fork.length * 0.5) stepTunnel(tube, 1 / 120, 1, steer);
  const stopped = stepTunnel(tube, 0, 0, 0);
  for (let i = 0; i < 60; i++) assert.deepEqual(stepTunnel(tube, 1 / 60, 0, 0), stopped, 'releasing forward stops midway through the curve');
  let previous = stopped, rotation = orientation(tube, previous);
  for (let i = 0; i < 150; i++) {
    const pose = stepTunnel(tube, 1 / 120, -1, 0);
    const nextRotation = orientation(tube, pose);
    assert.ok(rotation.angleTo(nextRotation) < 0.06, 'U-turn remains smooth within the fork');
    assert.equal(pose.x, stopped.x); assert.equal(pose.y, stopped.y); assert.equal(pose.z, stopped.z);
    previous = pose; rotation = nextRotation;
  }
  assert.equal(tube.direction, -1);
  while (tube.fork) {
    const pose = stepTunnel(tube, 1 / 120, 1, 0);
    const nextRotation = orientation(tube, pose);
    assert.ok(rotation.angleTo(nextRotation) < 0.06, 'smooth return to incoming arm');
    rotation = nextRotation;
  }
  assert.equal(tube.branch, branch, 'reversing in a fork returns along the incoming arm');
}
console.log('PASS: all six fork routes at 30/60/120 fps, running/walking, smooth position and orientation, tube clearance, stop and reverse mid-fork');
