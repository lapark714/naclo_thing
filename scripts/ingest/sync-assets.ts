/**
 * Copies content/assets into public/content-assets so Next can serve them.
 *
 * The canonical home for a problem's images is next to the records they belong
 * to, in content/. public/ is a build artefact of that, regenerated before dev
 * and build so the two never drift.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const SRC = "content/assets";
const DEST = "public/content-assets";

if (!existsSync(SRC)) {
  console.log(`No ${SRC} directory. Nothing to sync.`);
  process.exit(0);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(SRC, DEST, { recursive: true });

console.log(`Synced ${SRC} -> ${DEST}`);
