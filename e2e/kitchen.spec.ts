import { expect, test, type Page } from '@playwright/test';

const chef = (page: Page) => page.evaluate(() => window.__kitchen!.chef());

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Gets past the pre-service card (its button has focus) and skips the predict board. */
async function skipPrediction(page: Page) {
  await page.keyboard.press('Enter');
  await page.locator('#skip-predict').press('Enter');
  await expect(page.locator('#predict')).toHaveCount(0);
}

/** Fills in the Prediction by keyboard alone: ↑/↓ picks a card, Shift+↑ moves it into its slot. */
async function predictByKeyboard(page: Page, order: string[]) {
  await expect(page.locator('#card')).toContainText('One Dish at a time, to the end.');
  await page.keyboard.press('Enter');
  const cards = page.locator('#predict-cards li');
  let focus = 0;
  for (const [slot, line] of order.entries()) {
    const from = (await cards.allTextContents()).indexOf(line);
    for (; focus < from; focus++) await page.keyboard.press('ArrowDown');
    for (; focus > from; focus--) await page.keyboard.press('ArrowUp');
    for (; focus > slot; focus--) await page.keyboard.press('Shift+ArrowUp');
  }
  await expect(cards).toHaveText(order);
  for (; focus < order.length - 1; focus++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.locator('#lock-in')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#predict')).toHaveCount(0);
}

for (const url of ['/', '/?webgl']) {
  test(`the Head Chef walks with the keyboard and stops at the Stove (${url})`, async ({ page }) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__kitchen);
    if (url.includes('webgl')) expect(await page.evaluate(() => window.__kitchen!.backend)).toBe('WebGL 2');

    // The kitchen gets no keys until service starts.
    const start = await chef(page);
    await hold(page, 'ArrowLeft', 300);
    expect(await chef(page)).toEqual(start);
    await skipPrediction(page);

    await hold(page, 'ArrowLeft', 300);
    const moved = await chef(page);
    expect(moved.x).toBeLessThan(start.x - 0.2);
    expect(moved.z).toBeCloseTo(start.z);

    // The Stove (cell 4,3) is straight ahead: walking into it for a long time stops at its edge.
    await hold(page, 'ArrowRight', 300);
    await hold(page, 'ArrowUp', 1500);
    const stopped = await chef(page);
    expect(stopped.z).toBeGreaterThan(3.5);
    expect(stopped.z).toBeLessThan(start.z - 0.5);
    expect(await page.evaluate(() => window.__kitchen!.facing())).toEqual({ x: 4, z: 3 });
  });
}

// Every station is reached from the open row 4, and the Oven from column 2. Overshooting a
// little is fine: actions snap to the faced cell.
async function moveTo(page: Page, axis: 'x' | 'z', target: number) {
  const now = (await chef(page))[axis];
  if (Math.abs(now - target) < 0.1) return;
  const sign = Math.sign(target - now);
  const key = axis === 'x' ? (sign > 0 ? 'ArrowRight' : 'ArrowLeft') : sign > 0 ? 'ArrowDown' : 'ArrowUp';
  await page.keyboard.down(key);
  await page.waitForFunction(
    ({ axis, target, sign }) => sign * (window.__kitchen!.chef()[axis] - target) >= -0.05,
    { axis, target, sign },
  );
  await page.keyboard.up(key);
}
const CELLS = {
  stove: [4, 4, 'ArrowUp'],
  orangeRail: [3, 4, 'ArrowUp'],
  purpleRail: [5, 4, 'ArrowUp'],
  oven: [2, 1, 'ArrowUp'],
  checkCounter: [4, 5, 'ArrowDown'],
} as const;
async function goTo(page: Page, station: keyof typeof CELLS) {
  const [x, z, face] = CELLS[station];
  await moveTo(page, 'z', 4);
  await moveTo(page, 'x', x);
  await moveTo(page, 'z', z);
  await hold(page, face, 100);
}
async function use(page: Page, station: keyof typeof CELLS) {
  await goTo(page, station);
  await page.keyboard.press('Space');
}

const ticketLabel = (page: Page, ticket: string) => page.locator(`.ticket-label[data-ticket="${ticket}"]`);

// The seed-0 run predicts the other race order: either one earns the bonus star.
for (const { seed, ovenReady, expected, prediction } of [
  { seed: 1, ovenReady: true, expected: ['A', 'F', 'E', 'D', 'B', 'C'], prediction: null },
  { seed: 0, ovenReady: false, expected: ['A', 'F', 'E', 'D', 'C', 'B'], prediction: ['A', 'F', 'E', 'D', 'B', 'C'] },
]) {
  test(`plays the boss Shift by keyboard, Oven ${ovenReady ? 'ready' : 'not ready'} on Lap 1 (seed ${seed})`, async ({
    page,
  }) => {
    await page.goto(`/?seed=${seed}`);
    await page.waitForFunction(() => window.__kitchen);
    await expect(page.locator('#program-name')).toHaveText('program.cjs');
    await expect(page.locator('#rules')).toContainText('Then walk the Ring.');
    if (prediction) await predictByKeyboard(page, prediction);
    else await skipPrediction(page);
    const cooking = page.locator('#program li.cooking');
    const holding = page.locator('#held');
    const receipt = page.locator('#receipt li');
    const toast = page.locator('#toast');

    // The Opening dish: cook each line, Routing every new Ticket where its kind waits.
    await expect(cooking).toHaveText("console.log('A');");
    await use(page, 'stove');
    await expect(receipt).toHaveText(['A']);
    await use(page, 'stove');
    await expect(holding).toHaveText('B (blue)');
    await expect(ticketLabel(page, 'B')).toBeVisible();

    // A wrong station buzzes, and the Ticket stays held.
    await use(page, 'checkCounter');
    await expect(toast).toHaveText(/Buzz! The Check counter refuses B/);
    await expect(toast).toHaveClass(/buzz/);
    await expect(page.locator('#mistakes')).toHaveText('1');
    await expect(holding).toHaveText('B (blue)');

    await use(page, 'oven');
    await expect(holding).toHaveText('nothing');
    for (const [station, ticket] of [
      ['checkCounter', 'C'],
      ['purpleRail', 'D'],
      ['orangeRail', 'E'],
    ] as const) {
      await use(page, 'stove');
      await expect(holding).toHaveText(new RegExp(`^${ticket} `));
      await use(page, station);
      await expect(holding).toHaveText('nothing');
    }
    await use(page, 'stove');
    await expect(receipt).toHaveText(['A', 'F']);
    await expect(cooking).toHaveCount(0);

    // Clear the Rails: orange, then purple.
    for (const rail of ['orangeRail', 'purpleRail'] as const) {
      await use(page, rail);
      await use(page, 'stove');
    }
    await expect(receipt).toHaveText(['A', 'F', 'E', 'D']);
    await expect(page.locator('#lap')).toHaveText('1');

    // Walk the Ring. Walking costs no time: the Oven's countdown doesn't move while the Head Chef walks.
    const countdown = await ticketLabel(page, 'B').textContent();
    await goTo(page, 'checkCounter');
    await goTo(page, 'oven');
    await expect(ticketLabel(page, 'B')).toHaveText(countdown!);
    if (ovenReady) {
      await expect(ticketLabel(page, 'B')).toHaveText('B ✓ ready');
      await use(page, 'oven');
      await use(page, 'stove');
      await use(page, 'checkCounter');
      await use(page, 'stove');
    } else {
      await expect(ticketLabel(page, 'B')).toHaveText(/B ⏲ \d/);
      await page.keyboard.press('Space');
      await expect(toast).toHaveText(/isn’t ready/);
      await use(page, 'checkCounter');
      await use(page, 'stove');
      await use(page, 'oven');
      await expect(page.locator('#lap')).toHaveText('2');
      await use(page, 'stove');
    }

    await expect(receipt).toHaveText(expected);
    await expect(page.locator('#closed')).toBeVisible();

    // The results screen: star 1, both Receipts side by side with no differences.
    await expect(page.locator('#stars')).toHaveText(/★ Star 1/);
    await expect(page.locator('#bonus-star')).toHaveText(prediction ? /★ Bonus star/ : /skipped the Prediction/);
    await expect(page.locator('#rules')).toBeVisible();
    await expect(page.locator('#compare tr')).toHaveText(expected.map((line) => line + line));
    await expect(page.locator('#compare tr.differs')).toHaveCount(0);
    await expect(page.locator('#broken-rules')).toHaveText('No Kitchen rules broken.');
    await expect(page.locator('#result-mistakes')).toHaveText('1');

    // The Replay notes the race only when the Oven wasn't ready on Lap 1, even on a correct Shift.
    await page.locator('#open-replay').click();
    await page.locator('#replay-next').evaluate((next: HTMLButtonElement) => { while (!next.disabled) next.click(); });
    await expect(page.locator('.replay-note.race')).toHaveCount(ovenReady ? 0 : 1);
    await expect(page.locator('.replay-note.race')).toHaveText(ovenReady ? [] : [/can't promise setTimeout's B before setImmediate's C/]);
    await page.locator('#replay-close').click();

    // Retry restarts the Shift; the URL keeps the seed fixed.
    await page.keyboard.press('Enter');
    await expect(page.locator('#results')).toHaveCount(0);
    await expect(receipt).toHaveCount(0);
    expect(page.url()).toContain(`seed=${seed}`);
  });
}

test('X-ray is on at the start and X toggles it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kitchen);
  await skipPrediction(page);
  const oven = page.locator('.station-label[data-station="O"]');
  await expect(page.locator('.station-label')).toHaveCount(8);
  await expect(oven.getByText('timers phase')).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(oven.getByText('timers phase')).toBeHidden();
  await expect(oven).toContainText('Oven');
  await page.keyboard.press('KeyX');
  await expect(oven.getByText('timers phase')).toBeVisible();
});

test('the Replay explains a rule 2 break', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.waitForFunction(() => window.__kitchen);
  await skipPrediction(page);
  for (const station of ['stove', 'stove', 'oven', 'stove', 'checkCounter', 'stove', 'purpleRail', 'stove', 'orangeRail', 'stove'] as const) {
    await use(page, station);
  }
  // Rule 2 on purpose: the purple Rail before the orange one.
  for (const station of ['purpleRail', 'stove', 'orangeRail', 'stove', 'oven', 'stove', 'checkCounter', 'stove'] as const) {
    await use(page, station);
  }
  await expect(page.locator('#receipt li')).toHaveText(['A', 'F', 'D', 'E', 'B', 'C']);

  await page.locator('#open-replay').click();
  await expect(page.locator('#replay-step')).toHaveText('Step 1 of 18: Cooked line 1: printed A');
  await expect(page.locator('#program li.replay-line')).toHaveText("console.log('A');");
  await page.locator('#replay-next').click();
  await expect(page.locator('#program li.replay-line')).toHaveText("setTimeout(() => console.log('B'), 0);");
  await page.locator('#replay-back').click();
  await expect(page.locator('#program li.replay-line')).toHaveText("console.log('A');");

  // Play pauses at the first wrong line, D, and explains it.
  await page.locator('#replay-play').click();
  await expect(page.locator('#replay-step')).toHaveText('Step 12 of 18: Cooked line 4: printed D', { timeout: 10_000 });
  await page.waitForTimeout(700);
  await expect(page.locator('#replay-step')).toContainText('Step 12 of 18');
  await expect(page.locator('#program li.replay-line')).toHaveText("Promise.resolve().then(() => console.log('D'));");
  const rule = page.locator('.replay-note.rule-2');
  await expect(rule).toHaveText(/Node ran D's Promise.then callback while the nextTick queue still had E's/);
  await expect(page.locator('.replay-note.node-line')).toContainText('Real Node printed E here, not D.');
  // X-ray off: kitchen words.
  await page.keyboard.press('KeyX');
  await expect(rule.locator('.say-kitchen')).toHaveText(/^You cooked D while the orange rail still had E\./);
  await expect(rule.locator('.say-node')).toBeHidden();
});
