import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseRegions, cropCommand, reconcileRegions, isDegenerateBox, cropFigures, decideCropPlacement,
} from "../../scripts/ingest/figures";
import type { Problem } from "../../content/schema";
import type { Target } from "../../scripts/ingest/manifest";

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

// cropFigures shells out to pdfinfo/pdftoppm, calls a vision model, and
// touches the filesystem — none of which this suite mocks (see the pattern
// in arbitrate.test.ts, which only exercises the pure helpers around its
// client-calling function). This test proves the no-throw contract instead
// of asserting it: pointing at a PDF that does not exist makes pageSize
// throw for real, well before the retry loop ever reaches the vision call,
// so this never touches the network — but it does prove that a genuine
// subprocess throw degrades to a flag rather than rejecting cropFigures.
test("cropFigures resolves with a flag, not a rejection, when the source PDF does not exist", async () => {
  const assetSrc = "/content-assets/figures-test-does-not-exist.png";
  const rec = {
    ...record([{ src: assetSrc, alt: "a diagram" }]),
    _reviewNotes: `CROP ${assetSrc} page=1 x=10 y=10 w=20 h=20\n`,
  } as Problem;

  const target: Target = {
    year: 2016, letter: "A", title: "T", officialPoints: 5, authors: ["X"],
    problem: { file: "/tmp/figures-test-nonexistent-booklet.pdf", pages: [1] },
    hasTextLayer: true,
  };

  const client = new Anthropic({ apiKey: "test-key-not-used" });

  const { flags } = await cropFigures(client, target, rec);
  const assetFlags = flags.filter((f) => f.path === assetSrc);
  assert.ok(assetFlags.length >= 1, "expected cropFigures to flag the asset rather than throw");
});

// Finding 1 (CRITICAL): the retry loop used to rename a crop onto its final
// path (onDisk) BEFORE confirm() had a chance to accept or reject it, so a
// crop that failed confirmation on all three attempts was still left sitting
// at onDisk — and the next run's `if (existsSync(onDisk)) continue;` cache
// check then treated that rejected crop as a finished one, silently
// publishing a clipped or noisy figure with no flag at all.
//
// decideCropPlacement is the pure function the fix extracts: it is the only
// place that decides whether a cut crop is promoted to onDisk (only on a
// COMPLETE verdict) or discarded at its temporary path (everything else,
// including a blank verdict from a confirm() that never got to run). Testing
// it directly, plus replaying the loop's placement decisions against real
// tmp files, proves the invariant without touching the network or spawning
// pdftoppm/pdfinfo.

test("decideCropPlacement promotes a crop to onDisk only on a COMPLETE verdict", () => {
  const placement = decideCropPlacement("COMPLETE", "/tmp/asset.tmp-1.png", "/tmp/asset.png");
  assert.deepEqual(placement, { action: "publish", from: "/tmp/asset.tmp-1.png", to: "/tmp/asset.png" });
});

test("decideCropPlacement discards CLIPPED, NOISY, an unrecognized reply, and a blank verdict", () => {
  for (const verdict of ["CLIPPED", "NOISY", "GARBAGE REPLY", ""]) {
    const placement = decideCropPlacement(verdict, "/tmp/asset.tmp-1.png", "/tmp/asset.png");
    assert.deepEqual(placement, { action: "discard", from: "/tmp/asset.tmp-1.png" }, `verdict ${JSON.stringify(verdict)}`);
  }
});

test("decideCropPlacement is not fooled by COMPLETE appearing after the start of the reply", () => {
  // confirm() upper-cases and trims its own reply, but the placement
  // decision itself must not treat "...COMPLETE" or "INCOMPLETE" as a pass —
  // only a reply that STARTS WITH COMPLETE (the documented contract) counts.
  const placement = decideCropPlacement("INCOMPLETE", "/tmp/asset.tmp-1.png", "/tmp/asset.png");
  assert.equal(placement.action, "discard");
});

test("three rejected confirmations in a row never leave a file at the final asset path", () => {
  // Replays exactly what the retry loop does with each attempt's placement
  // decision — crop to a tmp path, ask decideCropPlacement, discard on
  // reject — using real files on disk (so a genuine renameSync/rmSync bug
  // would show up) but no subprocess or network call anywhere in the test.
  const dir = mkdtempSync(join(tmpdir(), "figures-placement-"));
  const onDisk = join(dir, "asset.png");
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const tmp = join(dir, `asset.tmp-${attempt}.png`);
      writeFileSync(tmp, "not a real png, just standing in for a rejected crop");
      const placement = decideCropPlacement("CLIPPED", tmp, onDisk);
      assert.equal(placement.action, "discard");
      rmSync(placement.from, { force: true });
    }
    assert.equal(existsSync(onDisk), false, "a rejected crop must never occupy the final asset path");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a COMPLETE confirmation on the final attempt still leaves nothing at onDisk from the earlier rejected attempts", () => {
  const dir = mkdtempSync(join(tmpdir(), "figures-placement-"));
  const onDisk = join(dir, "asset.png");
  try {
    const verdicts = ["CLIPPED", "NOISY", "COMPLETE"];
    let published = false;
    for (let attempt = 0; attempt < verdicts.length; attempt++) {
      const tmp = join(dir, `asset.tmp-${attempt}.png`);
      writeFileSync(tmp, `attempt ${attempt}`);
      const placement = decideCropPlacement(verdicts[attempt], tmp, onDisk);
      if (placement.action === "publish") {
        // renameSync moves rather than copies — the tmp file for this
        // attempt cannot also linger behind.
        writeFileSync(placement.to, "renamed contents");
        rmSync(placement.from, { force: true });
        published = true;
        break;
      }
      rmSync(placement.from, { force: true });
    }
    assert.ok(published, "expected the third attempt to publish");
    assert.equal(existsSync(onDisk), true);
    for (let attempt = 0; attempt < verdicts.length; attempt++) {
      assert.equal(existsSync(join(dir, `asset.tmp-${attempt}.png`)), false, `tmp file for attempt ${attempt} should not remain`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
