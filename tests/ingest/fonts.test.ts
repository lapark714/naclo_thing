import { test } from "node:test";
import assert from "node:assert/strict";
import { blockOf, googleCssUrl, parseFontFaces } from "../../scripts/ingest/fonts";

test("blockOf identifies scripts the archive uses", () => {
  assert.equal(blockOf(0x0561)?.name, "Armenian");
  assert.equal(blockOf(0x0915)?.name, "Devanagari");
  assert.equal(blockOf(0x10D0)?.name, "Georgian");
  assert.equal(blockOf(0x13A0)?.name, "Cherokee");
  assert.equal(blockOf(0x30A2)?.name, "Katakana");
});

test("blockOf returns null for an unmapped codepoint", () => {
  assert.equal(blockOf(0x1F600), null);
});

test("googleCssUrl requests a 400-weight family", () => {
  const url = googleCssUrl("Noto Sans Armenian");
  assert.ok(url.includes("family=Noto+Sans+Armenian"));
  assert.ok(url.includes("wght@400"));
});

test("parseFontFaces pairs each woff2 url with its unicode-range", () => {
  const css = `
/* armenian */
@font-face {
  font-family: 'Noto Sans Armenian';
  src: url(https://fonts.gstatic.com/s/x/v1/abc.woff2) format('woff2');
  unicode-range: U+0308, U+0530-058F, U+FB13-FB17;
}`;
  const faces = parseFontFaces(css);
  assert.equal(faces.length, 1);
  assert.equal(faces[0].woff2Url, "https://fonts.gstatic.com/s/x/v1/abc.woff2");
  assert.ok(faces[0].unicodeRange.includes("U+0530-058F"));
});

test("parseFontFaces ignores a face with no woff2 source", () => {
  assert.deepEqual(parseFontFaces("@font-face { font-family: 'X'; src: url(a.ttf) format('truetype'); }"), []);
});
