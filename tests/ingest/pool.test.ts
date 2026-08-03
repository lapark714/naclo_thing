import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPool } from "../../scripts/ingest/pool";

test("preserves input order regardless of completion order", async () => {
  const delays = [30, 5, 20, 1];
  const out = await mapPool(delays, 4, async (d, i) => {
    await new Promise((r) => setTimeout(r, d));
    return i;
  });
  assert.deepEqual(out, [0, 1, 2, 3]);
});

test("never exceeds the concurrency limit", async () => {
  let active = 0;
  let peak = 0;
  await mapPool(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
  });
  assert.ok(peak <= 4, `peak concurrency was ${peak}`);
});

test("handles an empty list", async () => {
  assert.deepEqual(await mapPool([], 4, async () => 1), []);
});
