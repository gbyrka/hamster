const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 800 },
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.HAMSTER_URL ||
        pathToFileURL(path.resolve(__dirname, "../index.html")).href
    );
    await page.waitForFunction(
      () => !document.querySelector("#start").disabled
    );
    await page.evaluate(
      () => (document.querySelector("#overlay").hidden = true)
    );
    await page.evaluate(
      () => (document.querySelector("#overlay").hidden = false)
    );
    await page.click("#start");
    await page.evaluate(() => { HamsterGame.state.time = 3600; });
    for (const [branch, y, z] of [
      [0, 6, -4],
      [1, 0, -7],
      [2, 0, 7],
    ]) {
      await page.evaluate(
        ({ y, z }) =>
          Object.assign(HamsterGame.state, {
            x: 8.5,
            y,
            z,
            angle: -Math.PI / 2,
            speed: 0,
            tube: null,
            pitch: 0,
            curl: 0,
          }),
        { y, z }
      );
      await page.keyboard.down("w");
      await page.waitForFunction(() => HamsterGame.state.tube?.s > 2.5);
      await page.keyboard.up("w");
      assert.equal(
        await page.evaluate(() => HamsterGame.state.tube.branch),
        branch
      );
      if (branch === 0) {
        await page.evaluate(() => {
          HamsterGame.state.pouch = [0, 1];
        });
        const beforeMeal = await page.evaluate(() => ({
          s: HamsterGame.state.tube.s,
          score: HamsterGame.state.score,
          eaten: HamsterGame.state.eaten,
        }));
        await page.keyboard.down("Space");
        await page.waitForFunction(() => HamsterGame.state.eat > 0.15);
        await page.keyboard.up("Space");
        await page.waitForFunction(() => HamsterGame.state.eat === 0);
        assert.equal(
          await page.evaluate(() => HamsterGame.state.pouch.length),
          2,
          "interrupted chewing keeps treats"
        );
        await page.keyboard.down("Space");
        await page.waitForFunction(() => HamsterGame.state.pouch.length === 0);
        await page.keyboard.up("Space");
        const afterMeal = await page.evaluate(() => ({
          s: HamsterGame.state.tube.s,
          score: HamsterGame.state.score,
          eaten: HamsterGame.state.eaten,
        }));
        assert.equal(
          afterMeal.s,
          beforeMeal.s,
          "eating stays in place inside tube"
        );
        assert.equal(afterMeal.score - beforeMeal.score, 30);
        assert.equal(afterMeal.eaten - beforeMeal.eaten, 2);
      }
      await page.waitForTimeout(500);
      await page.keyboard.down("s");
      await page.waitForFunction(() => HamsterGame.state.curl > 0.9);
      await page.evaluate(() => {
        HamsterGame.state.mode = "paused";
      });
      const frozen = await page.evaluate(() => ({
        s: HamsterGame.state.tube.s,
        elapsed: HamsterGame.state.tube.turn.elapsed,
      }));
      await page.waitForTimeout(500);
      assert.deepEqual(
        await page.evaluate(() => ({
          s: HamsterGame.state.tube.s,
          elapsed: HamsterGame.state.tube.turn.elapsed,
        })),
        frozen
      );
      await page.evaluate(() => {
        HamsterGame.state.mode = "playing";
      });
      await page.waitForFunction(() => HamsterGame.state.tube.direction === -1);
      await page.keyboard.up("s");
      await page.keyboard.down("w");
      await page.waitForFunction(() => HamsterGame.state.tube === null);
      await page.keyboard.up("w");
      const state = await page.evaluate(() => HamsterGame.state);
      assert.equal(state.y, y);
      assert.ok(state.x < 9);
    }
    console.log("PASS browser: entrances, exits and curled turns");
    const { tunnelPaths, tunnelPose, tunnelBranch } = await import('../tunnel.js');
    for (let branch = 0; branch < 3; branch++) for (const steer of [-1, 1]) {
      const s = tunnelPaths[branch].length - 1;
      await page.evaluate(({ branch, s, pose }) => {
        Object.assign(HamsterGame.state, pose, {
          tube: { branch, s, direction: 1 }, speed: 0, curl: 0, time: 180,
        });
      }, { branch, s, pose: tunnelPose(branch, s) });
      console.log(`Checking fork ${branch}, steer ${steer}`);
      const key = steer < 0 ? 'a' : 'd';
      await page.keyboard.down(key);
      await page.keyboard.down('w');
      await page.waitForFunction(() => !!HamsterGame.state.tube?.fork);
      await page.keyboard.press('Escape');
      const frozen = await page.evaluate(() => ({
        x: HamsterGame.state.x, y: HamsterGame.state.y, z: HamsterGame.state.z,
        angle: HamsterGame.state.angle, s: HamsterGame.state.tube.fork.s,
      }));
      await page.waitForTimeout(120);
      assert.deepEqual(await page.evaluate(() => ({
        x: HamsterGame.state.x, y: HamsterGame.state.y, z: HamsterGame.state.z,
        angle: HamsterGame.state.angle, s: HamsterGame.state.tube.fork.s,
      })), frozen, 'pause freezes position and rotation midway through a fork');
      await page.keyboard.up('w');
      await page.keyboard.up(key);
      await page.click('#resume');
      await page.keyboard.down('w');
      await page.waitForFunction(() => !HamsterGame.state.tube?.fork);
      await page.keyboard.up('w');
      assert.equal(await page.evaluate(() => HamsterGame.state.tube.branch), tunnelBranch(branch, steer));
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser: all three entrances, curl, pause during turn, exits, six rounded forks with pause/resume, no JS errors"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
