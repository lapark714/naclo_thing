import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegions, cropCommand, reconcileRegions, isDegenerateBox } from "../../scripts/ingest/figures";
import type { Problem } from "../../content/schema";

function record(assets: { src: string; alt: string }[]): Problem {
  return {
    id: "x", tier: "full", year: 2016, round: "open", letter: "A", title: "T",
    authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["phonology"], formTag: "rule-discovery", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml: "", assets,
    questions: [], hints: [], explanationHtml: "", reviewStatus: "drafted",
  } as Problem;
}

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

test("cropCommand never emits a negative width for an out-of-range xPct", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 105, yPct: 10, wPct: 20, hPct: 20 }, 1000, 1000, "/tmp/o");
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  assert.ok(w >= 0, `width ${w} is negative`);
  assert.equal(w, 0);
});

test("cropCommand at the page's right edge (xPct=100) produces a zero, not negative, width", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 100, yPct: 10, wPct: 20, hPct: 20 }, 1000, 1000, "/tmp/o");
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  assert.equal(w, 0);
});

test("cropCommand clamps an oversized width to the remaining page width", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 0, yPct: 10, wPct: 200, hPct: 20 }, 1000, 1000, "/tmp/o");
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  assert.equal(w, 1000);
});

test("cropCommand leaves a normal in-range box unchanged by the new clamping", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 20, yPct: 20, wPct: 30, hPct: 30 }, 800, 600, "/tmp/o");
  assert.equal(Number(cmd[cmd.indexOf("-x") + 1]), 160);
  assert.equal(Number(cmd[cmd.indexOf("-y") + 1]), 120);
  assert.equal(Number(cmd[cmd.indexOf("-W") + 1]), 240);
  assert.equal(Number(cmd[cmd.indexOf("-H") + 1]), 180);
});

test("isDegenerateBox catches a box that clamps to zero area before pdftoppm ever runs", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 105, yPct: 10, wPct: 20, hPct: 20 }, 1000, 1000, "/tmp/o");
  assert.equal(isDegenerateBox(cmd), true);
});

test("isDegenerateBox passes a normal in-range box", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 10, yPct: 10, wPct: 20, hPct: 20 }, 1000, 1000, "/tmp/o");
  assert.equal(isDegenerateBox(cmd), false);
});

test("reconcileRegions flags a CROP line with no matching asset", () => {
  const notes = "CROP /content-assets/orphan.png page=2 x=10 y=35 w=80 h=30\n";
  const flags = reconcileRegions(record([]), notes);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "figure");
  assert.equal(flags[0].path, "/content-assets/orphan.png");
});

test("reconcileRegions flags an asset with no CROP line", () => {
  const rec = record([{ src: "/content-assets/signs.png", alt: "signs" }]);
  const flags = reconcileRegions(rec, "Keys checked against the solution.\n");
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "figure");
  assert.equal(flags[0].path, "/content-assets/signs.png");
});

test("reconcileRegions produces no flags for a matched src/CROP pair", () => {
  const rec = record([{ src: "/content-assets/signs.png", alt: "signs" }]);
  const notes = "CROP /content-assets/signs.png page=2 x=10 y=35 w=80 h=30\n";
  assert.deepEqual(reconcileRegions(rec, notes), []);
});

test("reconcileRegions flags only the asset missing its CROP line among several", () => {
  const rec = record([
    { src: "/content-assets/signs.png", alt: "signs" },
    { src: "/content-assets/key.png", alt: "key" },
  ]);
  const notes = "CROP /content-assets/signs.png page=2 x=10 y=35 w=80 h=30\n";
  const flags = reconcileRegions(rec, notes);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "/content-assets/key.png");
});
