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
import { existsSync, readFileSync, mkdirSync, renameSync } from "node:fs";
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

export function cropCommand(
  file: string, region: Region, pageW: number, pageH: number, outBase: string,
): string[] {
  const x = Math.max(0, Math.round((region.xPct / 100) * pageW));
  const y = Math.max(0, Math.round((region.yPct / 100) * pageH));
  const w = Math.min(pageW - x, Math.round((region.wPct / 100) * pageW));
  const h = Math.min(pageH - y, Math.round((region.hPct / 100) * pageH));

  return [
    "-png", "-r", String(DPI),
    "-f", String(region.page), "-l", String(region.page),
    "-x", String(x), "-y", String(y), "-W", String(w), "-H", String(h),
    file, outBase,
  ];
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
  const flags: Flag[] = [];
  // _reviewNotes is written by the drafting pass (Stage 3) but is not part of
  // the published schema, so it only exists as an extra property on the raw
  // record — hence the cast rather than a schema field.
  const notes = String((record as unknown as { _reviewNotes?: string })._reviewNotes ?? "");
  const regions = parseRegions(notes);

  mkdirSync(ASSETS_DIR, { recursive: true });

  for (const asset of record.assets) {
    if (!asset.src.startsWith(ASSETS_PREFIX)) {
      flags.push({ kind: "figure", path: asset.src, note: `not under ${ASSETS_PREFIX}` });
      continue;
    }
    const onDisk = join(ASSETS_DIR, asset.src.slice(ASSETS_PREFIX.length));
    if (existsSync(onDisk)) continue;

    const region = regions.get(asset.src);
    if (!region) {
      flags.push({ kind: "figure", path: asset.src, note: "no CROP line in _reviewNotes" });
      continue;
    }

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
    const size = pageSize(target.problem.file, bookletPage);

    let box = { ...region, page: bookletPage };
    let verdict = "";
    let cut = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const base = onDisk.replace(/\.png$/, "");
      execFileSync("pdftoppm", cropCommand(target.problem.file, box, size.w, size.h, base));
      const produced = [`${base}-${box.page}.png`, `${base}-0${box.page}.png`, `${base}-00${box.page}.png`, `${base}.png`]
        .find((p) => existsSync(p));
      if (!produced) break;
      if (produced !== onDisk) renameSync(produced, onDisk);

      verdict = await confirm(client, onDisk, asset.alt);
      if (verdict.startsWith("COMPLETE")) { cut = true; break; }
      box = widen(box);
    }

    if (!cut) {
      flags.push({
        kind: "figure", path: asset.src,
        note: `crop not confirmed after 3 attempts (last verdict: ${verdict || "none"})`,
      });
    }
  }
  return { record, flags };
}
