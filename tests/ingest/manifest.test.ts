import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePageMap, parsePoints, parseAuthors } from "../../scripts/ingest/manifest";

const BOOKLET =
  "cover page\f" +
  "Problem Credits:\nProblem A: Michael Salter\n" +
  "Problem B: Dorottya Demszky, Yiwei Luo, and Tom McCoy\f" +
  "(A) Tangled Up In Nots (1/1) [5 points]\nMalay is an Austronesian language\f" +
  "(B) DAWG Breeds (1/2) [10 Points]\nDAWG describes\f" +
  "(B) DAWG Breeds (2/2)\nmore of B\f";

test("parsePageMap finds each problem's page span and title", () => {
  const { pages, titles } = parsePageMap(BOOKLET);
  assert.deepEqual(pages.get("A"), [3]);
  assert.deepEqual(pages.get("B"), [4, 5]);
  assert.equal(titles.get("A"), "Tangled Up In Nots");
});

test("parsePoints reads the points tag in either case", () => {
  const pts = parsePoints(BOOKLET);
  assert.equal(pts.get("A"), 5);
  assert.equal(pts.get("B"), 10);
});

test("parsePoints ignores continuation pages", () => {
  assert.equal(parsePoints("(B) DAWG Breeds (2/2)\n").size, 0);
});

test("parseAuthors reads the 'Problem X:' form and splits on commas and 'and'", () => {
  const a = parseAuthors(BOOKLET);
  assert.deepEqual(a.get("A"), ["Michael Salter"]);
  assert.deepEqual(a.get("B"), ["Dorottya Demszky", "Yiwei Luo", "Tom McCoy"]);
});

test("parseAuthors falls back to the 2022 '(X) Name' form and skips consultant lines", () => {
  const credits =
    "Problem Credits:\n(A) Michael Salter\n(B) Tom McCoy\n" +
    "Consultant: Asli Celikyilmaz\n(D) Daniel Lovsted\n" +
    "Story Author: Jubli Sowati, collected by Kate Lindsey\n" +
    "Image Credits:\n(A), map: Adapted from maps by Wikipedia users\n";
  const a = parseAuthors(credits);
  assert.deepEqual(a.get("A"), ["Michael Salter"]);
  assert.deepEqual(a.get("B"), ["Tom McCoy"]);
  assert.deepEqual(a.get("D"), ["Daniel Lovsted"]);
  assert.equal(a.has("C"), false);
});

test("parsers return empty maps on a mojibake booklet rather than throwing", () => {
  const cipher = "Ϭ1;Ϳ garbled Ϭ2";
  assert.equal(parsePoints(cipher).size, 0);
  assert.equal(parseAuthors(cipher).size, 0);
  assert.equal(parsePageMap(cipher).pages.size, 0);
});

test("parseAuthors extracts 2022-style authors when form feed immediately follows name", () => {
  const creditsWithFormFeed =
    "Problem Credits:\n(A) Michael Salter\f" +
    "next page\n(B) Tom McCoy\f" +
    "Image Credits:\n";
  const a = parseAuthors(creditsWithFormFeed);
  assert.deepEqual(a.get("A"), ["Michael Salter"]);
  assert.deepEqual(a.get("B"), ["Tom McCoy"]);
});
