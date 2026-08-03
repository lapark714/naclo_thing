import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegions, cropCommand } from "../../scripts/ingest/figures";

test("parseRegions reads CROP lines into regions keyed by asset src", () => {
  const notes =
    "Keys checked against the solution.\n" +
    "CROP /content-assets/2016-open-G-signs.png page=2 x=10 y=35 w=80 h=30\n" +
    "CROP /content-assets/2016-open-G-key.png page=3 x=5 y=10 w=90 h=20\n";
  const r = parseRegions(notes);
  assert.equal(r.size, 2);
  assert.deepEqual(r.get("/content-assets/2016-open-G-signs.png"), {
    page: 2, xPct: 10, yPct: 35, wPct: 80, hPct: 30,
  });
});

test("parseRegions ignores prose and malformed lines", () => {
  assert.equal(parseRegions("Please crop the diagram on page 2.\nCROP broken line\n").size, 0);
});

test("cropCommand converts percentages to pixel arguments", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 2, xPct: 10, yPct: 50, wPct: 80, hPct: 25 }, 1000, 1400, "/tmp/out");
  assert.ok(cmd.includes("-x")); assert.ok(cmd.includes("100"));
  assert.ok(cmd.includes("-y")); assert.ok(cmd.includes("700"));
  assert.ok(cmd.includes("-W")); assert.ok(cmd.includes("800"));
  assert.ok(cmd.includes("-H")); assert.ok(cmd.includes("350"));
  assert.ok(cmd.includes("-f")); assert.ok(cmd.includes("2"));
});

test("cropCommand clamps a box that runs off the page", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 90, yPct: 90, wPct: 40, hPct: 40 }, 1000, 1000, "/tmp/o");
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  const x = Number(cmd[cmd.indexOf("-x") + 1]);
  assert.ok(x + w <= 1000, `${x} + ${w} exceeds the page width`);
});
