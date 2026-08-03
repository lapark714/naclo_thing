import { test } from "node:test";
import assert from "node:assert/strict";
import { blockOf, googleCssUrl, parseFontFaces, groupByFamily, alreadyDeclared } from "../../scripts/ingest/fonts";

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

test("groupByFamily keeps every block that shares a family, not just the last one seen", () => {
  const greek = blockOf(0x0370)!;
  const cyrillic = blockOf(0x0400)!;
  const hiragana = blockOf(0x3040)!;
  const katakana = blockOf(0x30a0)!;

  const grouped = groupByFamily([greek, cyrillic, hiragana, katakana]);

  const notoSans = grouped.get("Noto Sans");
  assert.ok(notoSans);
  assert.deepEqual(notoSans!.map((b) => b.name).sort(), ["Cyrillic", "Greek"]);

  const notoSansJp = grouped.get("Noto Sans JP");
  assert.ok(notoSansJp);
  assert.deepEqual(notoSansJp!.map((b) => b.name).sort(), ["Hiragana", "Katakana"]);
});

test("groupByFamily gives a family with no sibling its own single-entry list", () => {
  const armenian = blockOf(0x0561)!;
  const grouped = groupByFamily([armenian]);
  assert.deepEqual(grouped.get("Noto Sans Armenian"), [armenian]);
});

test("alreadyDeclared finds a slug already present in the css", () => {
  const css = `@font-face {\n  src: url("/fonts/NotoSansArmenian-400-armenian.woff2") format("woff2");\n}`;
  assert.equal(alreadyDeclared(css, "NotoSansArmenian-400-armenian.woff2"), true);
});

test("alreadyDeclared returns false when the slug is not present", () => {
  assert.equal(alreadyDeclared("", "NotoSansArmenian-400-armenian.woff2"), false);
  assert.equal(
    alreadyDeclared('src: url("/fonts/Other-400-x.woff2")', "NotoSansArmenian-400-armenian.woff2"),
    false,
  );
});
