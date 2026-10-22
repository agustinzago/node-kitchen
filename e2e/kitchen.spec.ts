import { expect, test, type Page } from '@playwright/test';

const chef = (page: Page) => page.evaluate(() => window.__kitchen!.chef());

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

for (const url of ['/', '/?webgl']) {
  test(`the Head Chef walks with the keyboard and stops at the Stove (${url})`, async ({ page }) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__kitchen);
    if (url.includes('webgl')) expect(await page.evaluate(() => window.__kitchen!.backend)).toBe('WebGL 2');

    const start = await chef(page);
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

for (const { seed, ovenReady, expected } of [
  { seed: 1, ovenReady: true, expected: ['A', 'F', 'E', 'D', 'B', 'C'] },
  { seed: 0, ovenReady: false, expected: ['A', 'F', 'E', 'D', 'C', 'B'] },
]) {
  test(`plays the boss Shift by keyboard, Oven ${ovenReady ? 'ready' : 'not ready'} on Lap 1 (seed ${seed})`, async ({
    page,
  }) => {
    await page.goto(`/?seed=${seed}`);
    await page.waitForFunction(() => window.__kitchen);
    await expect(page.locator('#program-name')).toHaveText('program.cjs');
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
  });
}

test('X-ray is on at the start and X toggles it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__kitchen);
  const oven = page.locator('.station-label[data-station="O"]');
  await expect(page.locator('.station-label')).toHaveCount(8);
  await expect(oven.getByText('timers phase')).toBeVisible();
  await page.keyboard.press('KeyX');
  await expect(oven.getByText('timers phase')).toBeHidden();
  await expect(oven).toContainText('Oven');
  await page.keyboard.press('KeyX');
  await expect(oven.getByText('timers phase')).toBeVisible();
});
