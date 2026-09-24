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
      viewport: { width: 900, height: 700 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      process.env.HAMSTER_URL ||
        pathToFileURL(path.resolve(__dirname, "../index.html")).href
    );
    await page.waitForFunction(
      () => !document.querySelector("#start").disabled
    );
    await page.click("#start");
    for (const [key, direction] of [
      ["a", 1],
      ["d", -1],
    ]) {
      await page.keyboard.down(key);
      await page.waitForFunction(
        () => HamsterGame.state.standingTurn?.angle > 0.7
      );
      const turn = await page.evaluate(() => ({ ...HamsterGame.state }));
      assert.equal(turn.standingTurn.direction, direction);
      assert.equal(turn.x, 0);
      assert.equal(turn.z, 5);
      await page.keyboard.up(key);
      await page.waitForFunction(() => HamsterGame.state.standingTurn === null);
    }
    await page.keyboard.down("a");
    await page.waitForFunction(
      () => HamsterGame.state.standingTurn?.angle > 0.4
    );
    await page.keyboard.press("Escape");
    const paused = await page.evaluate(
      () => HamsterGame.state.standingTurn.angle
    );
    await page.waitForTimeout(300);
    assert.equal(
      await page.evaluate(() => HamsterGame.state.standingTurn.angle),
      paused
    );
    await page.keyboard.up("a");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => HamsterGame.state.standingTurn === null);
    for (const travel of ["w", "s"]) {
      await page.keyboard.down(travel);
      await page.keyboard.down("d");
      await page.waitForFunction(() => Math.abs(HamsterGame.state.speed) > 1);
      assert.equal(
        await page.evaluate(() => HamsterGame.state.standingTurn),
        null,
        "moving turns keep the walking gait"
      );
      await page.keyboard.up(travel);
      await page.keyboard.up("d");
      await page.waitForFunction(() => Math.abs(HamsterGame.state.speed) < 0.1);
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: stationary left/right steps, stop, pause, forward/backward steering and no browser errors"
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
