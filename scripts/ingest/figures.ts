/**
 * Stage 5 — cut the figures out of the booklet.
 *
 * This is the largest manual step in the pipeline today: roughly one to two
 * crops per problem, cut by hand. At 58 problems that is sixty to a hundred
 * and twenty of them.
 *
 * The model gives a coarse percentage box rather than a pixel-accurate one,
 * because vision models estimate precise bounding boxes badly but bracket a
 * region reliably. A confirm pass then looks at the cut image and says whether
 * it is complete, clipped, or full of stray text, and the box is widened and
 * retried. Two retries, then the problem parks.
 */

import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import type { Target } from "./manifest";

const MODEL = process.env.INGEST_MODEL || "claude-opus-5";
const ASSETS_DIR = "content/assets";
const ASSETS_PREFIX = "/content-assets/";
const DPI = 200;

export type Region = { page: number; xPct: number; yPct: number; wPct: number; hPct: number };

const CROP_LINE = /^CROP\s+(\S+)\s+page=(\d+)\s+x=([\d.]+)\s+y=([\d.]+)\s+w=([\d.]+)\s+h=([\d.]+)\s*$/gm;

export function parseRegions(reviewNotes: string): Map<string, Region> {
  const out = new Map<string, Region>();
  for (const m of reviewNotes.matchAll(CROP_LINE)) {
    out.set(m[1], {
      page: Number(m[2]), xPct: Number(m[3]), yPct: Number(m[4]),
      wPct: Number(m[5]), hPct: Number(m[6]),
    });
  }
  return out;
}

/**
 * The drafting model must keep two lists in sync: the `assets` array and the
 * CROP lines in `_reviewNotes`. Nothing else checks this — validate.ts only
 * validates assets a record actually declares, so a CROP line with no asset
 * entry produces no crop and no flag on its own, and an asset with no CROP
 * line has nothing to crop it with. Either drift is silent until a student
 * hits a missing figure. This checks both directions before any cropping runs.
 */
export function reconcileRegions(record: Problem, reviewNotes: string): Flag[] {
  const flags: Flag[] = [];
  const regions = parseRegions(reviewNotes);
  const assetSrcs = new Set(record.assets.map((a) => a.src));

  for (const src of regions.keys()) {
    if (!assetSrcs.has(src)) {
      flags.push({
        kind: "figure", path: src,
        note: "a crop region was described for an asset the record does not declare",
      });
    }
  }
  for (const asset of record.assets) {
    if (!regions.has(asset.src)) {
      flags.push({
        kind: "figure", path: asset.src,
        note: "the record declares an asset with no crop region described",
      });
    }
  }
  return flags;
}

export function cropCommand(
  file: string, region: Region, pageW: number, pageH: number, outBase: string,
): string[] {
  // The model's percentages are untrusted input — parseRegions accepts any
  // non-negative number, not just 0-100. x/y are clamped to the page on both
  // ends first; w/h are then clamped from below at 0 as well as from above,
  // so a box that starts past the page edge (x already at pageW) or that
  // overshoots it can never yield a negative -W/-H. pdftoppm rejects a
  // negative width/height and execFileSync throws on that, which is exactly
  // the crash this stage exists to prevent for one bad box among many.
  const x = Math.min(pageW, Math.max(0, Math.round((region.xPct / 100) * pageW)));
  const y = Math.min(pageH, Math.max(0, Math.round((region.yPct / 100) * pageH)));
  const w = Math.max(0, Math.min(pageW - x, Math.round((region.wPct / 100) * pageW)));
  const h = Math.max(0, Math.min(pageH - y, Math.round((region.hPct / 100) * pageH)));

  return [
    "-png", "-r", String(DPI),
    "-f", String(region.page), "-l", String(region.page),
    "-x", String(x), "-y", String(y), "-W", String(w), "-H", String(h),
    file, outBase,
  ];
}

/**
 * True when a crop box has no area once clamped to the page — either
 * because it started past the page edge (a >100% or otherwise out-of-range
 * percentage from an unreliable vision model) or because it lands exactly
 * on the edge (xPct/yPct = 100). cropCommand can no longer return a negative
 * width or height, but a zero-area box is still useless to hand to
 * pdftoppm, so this is checked before the subprocess ever runs.
 */
export function isDegenerateBox(cmd: string[]): boolean {
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  const h = Number(cmd[cmd.indexOf("-H") + 1]);
  return !(w > 0 && h > 0);
}

export type CropPlacement =
  | { action: "publish"; from: string; to: string }
  | { action: "discard"; from: string };

/**
 * The one place that decides whether a cut crop becomes the asset the site
 * serves. `onDisk` is the path both validate.ts and the NEXT run's
 * `existsSync(onDisk)` cache check trust as "this asset is finished" — so a
 * crop only ever lands there once `confirm()` has actually returned
 * COMPLETE. Every other verdict (CLIPPED, NOISY, garbage, or the empty
 * string a never-awaited confirm() leaves behind) discards the crop at its
 * temporary path instead. Pulled out as a pure function so the placement
 * rule itself — not the subprocess/network calls around it — is what gets
 * tested directly.
 */
export function decideCropPlacement(verdict: string, tmpPath: string, onDisk: string): CropPlacement {
  return verdict.startsWith("COMPLETE")
    ? { action: "publish", from: tmpPath, to: onDisk }
    : { action: "discard", from: tmpPath };
}

function pageSize(file: string, page: number): { w: number; h: number } {
  const info = execFileSync("pdfinfo", ["-f", String(page), "-l", String(page), file], { encoding: "utf8" });
  const m = info.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/);
  // pdfinfo reports page size in points (1/72 inch); pdftoppm renders at -r
  // DPI (pixels per inch). A pixel offset is therefore a point offset times
  // DPI/72 — get this backwards and every crop box lands off by ~2.8x at our
  // DPI of 200. Confirmed against a real page: 612x792pt (US Letter) scales
  // to 1700x2200px at 200dpi, which is exactly 8.5in x 11in x 200dpi.
  const scale = DPI / 72;
  if (!m) return { w: Math.round(612 * scale), h: Math.round(792 * scale) };
  return { w: Math.round(Number(m[1]) * scale), h: Math.round(Number(m[2]) * scale) };
}

/** Widens a box on each retry, since clipping is the common failure. */
function widen(r: Region): Region {
  return {
    page: r.page,
    xPct: Math.max(0, r.xPct - 6),
    yPct: Math.max(0, r.yPct - 6),
    wPct: Math.min(100, r.wPct + 12),
    hPct: Math.min(100, r.hPct + 12),
  };
}

async function confirm(client: Anthropic, imagePath: string, alt: string): Promise<string> {
  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text:
        `This image was cropped from a NACLO problem booklet. It should contain: ${alt}\n\n` +
        `Reply with exactly one word:\n` +
        `COMPLETE if the whole figure is visible with nothing important cut off\n` +
        `CLIPPED if any part of the figure is cut off at an edge\n` +
        `NOISY if it is complete but includes a lot of unrelated body text`,
    },
    {
      type: "image",
      source: { type: "base64", media_type: "image/png", data: readFileSync(imagePath).toString("base64") },
    },
  ];

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("").trim().toUpperCase();
}

export async function cropFigures(
  client: Anthropic, target: Target, record: Problem,
): Promise<{ record: Problem; flags: Flag[] }> {
  // _reviewNotes is written by the drafting pass (Stage 3) but is not part of
  // the published schema, so it only exists as an extra property on the raw
  // record — hence the cast rather than a schema field.
  const notes = String((record as unknown as { _reviewNotes?: string })._reviewNotes ?? "");
  const flags: Flag[] = reconcileRegions(record, notes);
  const regions = parseRegions(notes);

  try {
    mkdirSync(ASSETS_DIR, { recursive: true });
  } catch (err) {
    flags.push({
      kind: "figure", path: ASSETS_DIR,
      note: `could not create the assets directory: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { record, flags };
  }

  for (const asset of record.assets) {
    // A batch of 58 problems must survive one bad asset. Several calls in
    // this body shell out or hit the network (pdfinfo, pdftoppm, the vision
    // confirm call, the filesystem rename) and any of them can throw for
    // reasons that have nothing to do with this specific asset — a corrupt
    // page, disk full, a rate limit, a transient network failure. The inner
    // try/catches below give the more common failures a specific message;
    // this one is the backstop, so ANY throw from this asset's crop —
    // including ones from a call added here later — degrades to a flagged,
    // parked asset instead of aborting every problem still queued behind it.
    try {
      if (!asset.src.startsWith(ASSETS_PREFIX)) {
        flags.push({ kind: "figure", path: asset.src, note: `not under ${ASSETS_PREFIX}` });
        continue;
      }
      const onDisk = join(ASSETS_DIR, asset.src.slice(ASSETS_PREFIX.length));
      if (existsSync(onDisk)) continue;

      const region = regions.get(asset.src);
      // Already flagged by reconcileRegions above — nothing to crop with here.
      if (!region) continue;

      // region.page numbers pages within the problem the model was shown (1 =
      // the problem's first page); target.problem.pages holds the real booklet
      // page numbers. A model that miscounts pages should park for a human, not
      // silently crop the wrong page, so this is a flag rather than a fallback.
      const bookletPage = target.problem.pages[region.page - 1];
      if (bookletPage === undefined) {
        flags.push({
          kind: "figure", path: asset.src,
          note: `CROP line names page ${region.page}, but the problem has only ${target.problem.pages.length} page(s)`,
        });
        continue;
      }

      let size: { w: number; h: number };
      try {
        size = pageSize(target.problem.file, bookletPage);
      } catch (err) {
        flags.push({
          kind: "figure", path: asset.src,
          note: `could not read the page size: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }

      let box = { ...region, page: bookletPage };
      let verdict = "";
      let cut = false;
      let failureNote: string | null = null;
      // Tracks a produced-but-not-yet-placed tmp crop across the retry loop
      // so the finally block can clean it up no matter how the loop exits —
      // including confirm() throwing (a network error), which otherwise
      // leaves a rejected crop sitting on disk under nothing's ownership.
      let pendingTmp: string | null = null;

      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          // A crop is cut to a tmp path, never straight to onDisk. onDisk is
          // only ever written by the rename below, and only after confirm()
          // says COMPLETE — see decideCropPlacement. That is what keeps the
          // top-of-loop `existsSync(onDisk)` cache check honest on a re-run:
          // a rejected crop can never occupy the path that check trusts.
          const tmpBase = `${onDisk.replace(/\.png$/, "")}.tmp`;
          const cmd = cropCommand(target.problem.file, box, size.w, size.h, tmpBase);
          if (isDegenerateBox(cmd)) {
            failureNote =
              `crop region has no area once clamped to the page (x=${box.xPct} y=${box.yPct} ` +
              `w=${box.wPct} h=${box.hPct})`;
            break;
          }

          try {
            execFileSync("pdftoppm", cmd);
          } catch (err) {
            failureNote = `pdftoppm failed: ${err instanceof Error ? err.message : String(err)}`;
            break;
          }

          const produced = [`${tmpBase}-${box.page}.png`, `${tmpBase}-0${box.page}.png`, `${tmpBase}-00${box.page}.png`, `${tmpBase}.png`]
            .find((p) => existsSync(p));
          if (!produced) {
            failureNote = "pdftoppm did not produce the expected output file";
            break;
          }
          pendingTmp = produced;

          verdict = await confirm(client, produced, asset.alt);
          const placement = decideCropPlacement(verdict, produced, onDisk);
          if (placement.action === "publish") {
            renameSync(placement.from, placement.to);
            pendingTmp = null;
            cut = true;
            break;
          }

          // Rejected: clear the tmp crop before the next attempt (or before
          // this asset gives up) so nothing rejected ever accumulates or
          // gets mistaken for a finished asset.
          rmSync(placement.from, { force: true });
          pendingTmp = null;
          box = widen(box);
        }
      } finally {
        // Belt-and-braces for any exit the loop body did not already clean
        // up after itself — most notably confirm() throwing between
        // producing the tmp crop and this asset reaching a placement
        // decision. Whatever happens, a crop that was never confirmed
        // COMPLETE must not survive at any path once this asset is done.
        if (pendingTmp && existsSync(pendingTmp)) {
          try { rmSync(pendingTmp, { force: true }); } catch { /* best-effort cleanup */ }
        }
      }

      if (!cut) {
        flags.push({
          kind: "figure", path: asset.src,
          note: failureNote ?? `crop not confirmed after 3 attempts (last verdict: ${verdict || "none"})`,
        });
      }
    } catch (err) {
      flags.push({
        kind: "figure", path: asset.src,
        note: `unexpected error while cropping: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return { record, flags };
}
