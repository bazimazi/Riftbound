import { freshSave } from "../src/game/index.ts";
// A veteran fixture exercises every hero; fresh saves still have explicit lock tests.
export function veteranSave() {
  const save = freshSave();
  save.bosses = 8;
  save.best = 360;
  save.kills = 1500;
  save.runs = 6;
  save.chronicle.cinder = { dashes: 100 };
  save.realmRecords.hollow = { best: 360, finds: 20 };
  save.memories.cinder = {
    "hollow:10": true,
    "hollow:11": true,
    "hollow:12": true,
    "hollow:13": true,
  };
  return save;
}
export async function reveal(page, selector) {
  for (let i = 0; i < 30; i++) {
    if (await page.locator(selector).first().isVisible()) return;
    const next = page.getByRole("button", { name: "Next page", exact: true });
    if (!(await next.isVisible()) || !(await next.isEnabled())) break;
    await next.click();
  }
  throw new Error(`Unable to reveal ${selector}`);
}
