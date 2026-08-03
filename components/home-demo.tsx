"use client";

import { useState } from "react";
import Link from "next/link";
import { checkExact } from "@/lib/grading";

/**
 * One real blank from one real problem, on the landing page.
 *
 * The page used to describe the product instead of showing it, which is a poor
 * trade when the product is a puzzle. Every string here is verbatim from the
 * 2023 Open Round booklet, problem D, by Pavel Iosad: three of its given rows,
 * then its question (b), graded by the same `checkExact` the site uses. Three
 * rows is the fewest that make it solvable in one step, because the plural and
 * the "of" both have to appear somewhere before you can ask for them together.
 *
 * Deliberately writes no progress. Solving it here is a demonstration, not an
 * attempt, and it should not quietly mark a problem the visitor never opened.
 */

const GIVEN = [
  { permyak: "vərələn", english: "of my forest" },
  { permyak: "cerkulaɲ", english: "towards the house" },
  { permyak: "cerkuezliɕ", english: "from the houses" },
];

const ASK = "vərrezlən";
const KEY = "of the forests";
const VARIANTS = ["of forests"];

export function HomeDemo() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "wrong" | "correct" | "shown">(
    "idle",
  );

  const settled = state === "correct" || state === "shown";

  function check() {
    if (!value.trim()) return;
    setState(checkExact(value, KEY, VARIANTS).correct ? "correct" : "wrong");
  }

  return (
    <section aria-label="Try a problem" className="mt-8">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Permyak</th>
              <th>English</th>
            </tr>
          </thead>
          <tbody>
            {GIVEN.map((row) => (
              <tr key={row.permyak}>
                <td>
                  <span className="data">{row.permyak}</span>
                </td>
                <td>{row.english}</td>
              </tr>
            ))}
            <tr>
              <td>
                <span className="data">{ASK}</span>
              </td>
              <td>
                {settled ? (
                  <span className="data font-semibold text-ink">{KEY}</span>
                ) : (
                  <span className="inline-flex flex-wrap items-baseline gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          check();
                        }
                      }}
                      aria-label="Your translation"
                      spellCheck={false}
                      autoComplete="off"
                      size={18}
                      className={`data max-w-full border-0 border-b bg-transparent px-1 py-0.5 text-[0.95rem] focus:outline-2 focus:outline-offset-2 focus:outline-ink ${
                        state === "wrong" ? "border-mark" : "border-rule-strong"
                      }`}
                    />
                    {value.trim() && (
                      <button
                        type="button"
                        onClick={check}
                        className="border border-ink px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper"
                      >
                        Check
                      </button>
                    )}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
        {state === "correct" ? (
          <>
            <span className="font-semibold text-good">Correct.</span>{" "}
            That is one of six blanks in Pavel Iosad&rsquo;s Permyak problem, and you
            solved it without being taught a thing.{" "}
            <Link
              href="/practice/2023-open-D"
              className="text-action-deep underline underline-offset-2"
            >
              Finish it
            </Link>
            .
          </>
        ) : state === "wrong" ? (
          <>
            Not yet. Compare the first and third rows: one of them turns a
            single thing into several.{" "}
            <button
              type="button"
              onClick={() => setState("shown")}
              className="underline underline-offset-2 hover:text-ink"
            >
              Show the answer
            </button>
            .
          </>
        ) : state === "shown" ? (
          <>
            <span className="text-ink">of the forests.</span> Three rows was
            enough to get there, which is the whole idea.{" "}
            <Link
              href="/practice/2023-open-D"
              className="text-action-deep underline underline-offset-2"
            >
              See the rest of this problem
            </Link>
            .
          </>
        ) : (
          <>
            Three real rows from the 2023 exam. Work out the fourth. No Permyak
            required, and nothing here is a trick.
          </>
        )}
      </p>
    </section>
  );
}
