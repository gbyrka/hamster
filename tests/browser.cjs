const assert = require("node:assert/strict");
const { chromium, firefox } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const engine = process.env.HAMSTER_BROWSER === "firefox" ? firefox : chromium;
  const browser = await engine.launch({
    headless: true,
    args:
      engine === chromium
        ? ["--no-sandbox", "--enable-unsafe-swiftshader"]
        : [],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 800 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.HAMSTER_URL ||
        pathToFileURL(path.resolve(__dirname, "../index.html")).href
    );
    await page.waitForFunction(
      () => !document.querySelector("#start").disabled
    );
    await page.waitForFunction(
      () => window.HamsterGame.underfurTexture.image?.complete === true
    );
    assert.ok(
      await page.evaluate(
        () => window.HamsterGame.underfurTexture.image.naturalWidth >= 1024
      ),
      "detailed underfur loads from file://"
    );
    const read = () =>
      page.evaluate(async () => ({ ...window.HamsterGame.state }));
    const waitState = async (predicate) => {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const s = await read();
        if (predicate(s)) return s;
        await page.waitForTimeout(100);
      }
      throw new Error(
        "State condition timed out: " + JSON.stringify(await read())
      );
    };
    const patch = (data) =>
      page.evaluate(
        async (data) => Object.assign(window.HamsterGame.state, data),
        data
      );
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(
      await page.locator("#start").textContent(),
      "Start your adventure"
    );
    assert.equal(
      await page.evaluate(() => window.HamsterGame.foods.length),
      8,
      "only eight treats in the habitat"
    );
    await page.click("#start");
    await page.keyboard.down("w");
    await waitState((s) => s.speed > 4.2);
    const running = await read();
    assert.ok(running.z < 4.8, "keyboard moves hamster");
    assert.ok(running.energy < 100, "default running uses energy");
    await page.keyboard.down("ShiftLeft");
    await waitState((s) => s.speed < 2.6);
    assert.ok((await read()).speed > 2, "Shift changes running to walking");
    const walkingEnergy = (await read()).energy;
    await page.waitForTimeout(300);
    assert.ok((await read()).energy > walkingEnergy, "walking restores energy");
    await page.keyboard.up("ShiftLeft");
    await waitState((s) => s.speed > 4.2);
    await page.keyboard.down("ShiftRight");
    await waitState((s) => s.speed < 2.6);
    await page.keyboard.up("ShiftRight");
    await page.keyboard.up("w");
    await page.keyboard.press("Escape");
    let paused = await read();
    await page.waitForTimeout(400);
    assert.equal((await read()).time, paused.time, "pause freezes timer");
    await page.click("#resume");
    await patch({ x: -1, z: -4, y: 0, angle: 0, speed: 0 });
    await page.keyboard.down("w");
    await waitState((s) => s.z < -5.6);
    await page.keyboard.up("w");
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator("#level").textContent(),
      "01 / COZY HIDEOUT",
      "enter hut through doorway"
    );
    await page.keyboard.down("s");
    await waitState((s) => s.z > -4);
    await page.keyboard.up("s");
    await patch({ speed: 0 });
    await page.evaluate(async () => {
      const { state, foods } = window.HamsterGame;
      const f = foods.find((f) => f.level === 0);
      Object.assign(state, {
        x: f.group.position.x,
        z: f.group.position.z,
        y: 0,
        speed: 0,
        pouch: [],
      });
    });
    await waitState((s) => s.pouch.length > 0);
    assert.equal((await read()).score, 0, "collecting alone gives no points");
    // Move away from all pickups to test a complete meal deterministically.
    await patch({
      x: 0,
      z: 8.4,
      speed: 0,
      pouch: [0, 1, 2, 0, 2],
      eat: 0,
      score: 0,
      eaten: 0,
    });
    await page.keyboard.down("Space");
    await waitState((s) => s.eat > 0);
    await page.keyboard.up("Space");
    await waitState((s) => s.eat === 0);
    assert.deepEqual(
      (await read()).pouch,
      [0, 1, 2, 0, 2],
      "interrupted bite preserves all treats"
    );
    assert.equal((await read()).score, 0, "interrupted bite earns no points");
    await page.keyboard.down("Space");
    await waitState((s) => s.eat > 0);
    await patch({ eat: 0.84 });
    await waitState((s) => s.score > 0);
    await page.keyboard.up("Space");
    const meal = await read();
    assert.equal(meal.score, 100, "one bite awards the sum of all five treats");
    assert.equal(meal.eaten, 5, "one bite eats all five treats");
    assert.deepEqual(meal.pouch, [], "one bite empties the pouch");
    // Keep random respawns away from the spout while checking pouch priority.
    await page.evaluate(() => {
      for (const food of window.HamsterGame.foods) food.group.position.x = -9;
    });
    await patch({
      x: 7.8,
      z: 5.8,
      y: 0,
      angle: -Math.PI / 2,
      speed: 0,
      pouch: [1, 2],
      score: 0,
      energy: 40,
    });
    assert.equal(
      await page.evaluate(() => window.HamsterGame.nearWater()),
      true,
      "spout is reachable with the mouth"
    );
    await page.keyboard.down("Space");
    await waitState((s) => s.drink > 0);
    await page.keyboard.up("Space");
    await waitState((s) => s.drink === 0);
    assert.equal((await read()).score, 0, "interrupted sip earns no points");
    assert.deepEqual(
      (await read()).pouch,
      [1, 2],
      "water takes priority over eating"
    );
    await page.keyboard.down("Space");
    await waitState((s) => s.drink > 0);
    await patch({ drink: 1.19 });
    await waitState((s) => s.drinks === 1);
    assert.equal((await read()).score, 2, "sip gives two points");
    assert.deepEqual(
      (await read()).pouch,
      [1, 2],
      "drinking keeps collected treats"
    );
    assert.ok((await read()).energy > 48, "water restores energy");
    await page.waitForTimeout(350);
    assert.equal(
      (await read()).drinks,
      1,
      "holding Space cannot bypass cooldown"
    );
    await page.keyboard.up("Space");
    await page.keyboard.press("Escape");
    const cooldown = (await read()).drinkCooldown;
    await page.waitForTimeout(200);
    assert.equal(
      (await read()).drinkCooldown,
      cooldown,
      "pause freezes drinking cooldown"
    );
    await page.click("#resume");
    await patch({ drinkCooldown: 0, angle: Math.PI / 2, pouch: [] });
    assert.equal(
      await page.evaluate(() => window.HamsterGame.nearWater()),
      false,
      "facing away cannot drink"
    );
    await page.keyboard.down("Space");
    await page.waitForTimeout(200);
    assert.equal(
      (await read()).drink,
      0,
      "Space away from nozzle does not drink"
    );
    await page.keyboard.up("Space");
    await patch({ x: 6, z: 4, y: 0, speed: 0 });
    await page.keyboard.press("e");
    assert.ok(
      (await read()).wheelTransition?.entering,
      "entry starts with an approach animation"
    );
    assert.ok((await read()).z > 3.5, "entry does not teleport onto the tread");
    await page.keyboard.press("e");
    assert.ok(
      (await read()).wheelTransition?.entering,
      "repeated E does not restart entry"
    );
    await page.keyboard.press("Escape");
    const entryPaused = (await read()).wheelTransition;
    await page.waitForTimeout(200);
    assert.deepEqual(
      (await read()).wheelTransition,
      entryPaused,
      "pause freezes wheel entry"
    );
    await page.click("#resume");
    await waitState((s) => s.wheel && !s.wheelTransition);
    assert.equal((await read()).wheel, true, "wheel entry");
    await patch({ wheelProgress: 4.8, energy: 40 });
    const wheelAngle = () =>
      page.evaluate(() => window.HamsterGame.wheelRotor.rotation.z);
    const beforeForward = await wheelAngle();
    await page.keyboard.down("w");
    await waitState((s) => s.bonuses === 1);
    assert.ok(
      (await wheelAngle()) > beforeForward,
      "forward run moves bottom tread behind hamster"
    );
    assert.ok((await read()).speed > 0, "forward gait");
    assert.ok((await read()).energy > 40, "wheel restores energy");
    await patch({ bonuses: 3, wheelProgress: 4.9 });
    await page.waitForTimeout(600);
    assert.equal((await read()).bonuses, 3, "bonus limit");
    await page.keyboard.up("w");
    const beforeReverse = await wheelAngle();
    await page.keyboard.down("s");
    await waitState((s) => s.speed < 0);
    assert.ok(
      (await wheelAngle()) < beforeReverse,
      "reverse run reverses wheel rotation"
    );
    await page.keyboard.up("s");
    await waitState((s) => s.speed === 0);
    const stopped = await wheelAngle();
    await page.waitForTimeout(200);
    assert.equal(
      await wheelAngle(),
      stopped,
      "wheel stops when movement stops"
    );
    await page.keyboard.press("e");
    await waitState((s) => !s.wheel && !s.wheelTransition);
    assert.equal((await read()).wheel, false, "wheel exit");
    await patch({ score: 250, time: 0.1 });
    await waitState((s) => s.mode === "ended");
    assert.equal(await page.locator("#best").textContent(), "250");
    assert.ok((await page.locator("#history").textContent()).includes("250"));
    await page.reload();
    await page.waitForFunction(
      () => !document.querySelector("#start").disabled
    );
    assert.equal(
      await page.locator("#best").textContent(),
      "250",
      "record persists"
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true,
      "no horizontal overflow on small screens"
    );
    assert.equal(
      await page.locator("#start").isVisible(),
      true,
      "start available on mobile layout"
    );
    assert.deepEqual(errors, [], "no browser errors");
    console.log(
      "PASS: default running, Shift walking/energy, pause, hut entry/exit, collection, eight treats, whole-pouch eating, interrupted bites, drinking/priority/cooldown, wheel direction/entry/exit/energy/bonus cap, end, persistent record, responsive layout, no JS errors"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
