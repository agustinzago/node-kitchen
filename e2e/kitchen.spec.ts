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
