"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProblemSummary } from "@/lib/content";
import { useProgress } from "@/lib/progress";

type Props = { problems: ProblemSummary[] };

/**
 * Client-side filtering over the index generated at build. Filters stack, so
 * "morphology, hard" is a valid request.
 */
export function ConceptFilter({ problems }: Props) {
  const [concepts, setConcepts] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [playableOnly, setPlayableOnly] = useState(false);
  const progress = useProgress();

  const playableCount = problems.filter((p) => p.tier === "full").length;

  const allConcepts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of problems) {
      for (const tag of p.conceptTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [problems]);

  const filtered = problems.filter((p) => {
    if (playableOnly && p.tier !== "full") return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (concepts.length && !concepts.every((c) => p.conceptTags.includes(c))) return false;
    return true;
  });

  function toggleConcept(tag: string) {
    setConcepts((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <>
      <div className="border-y border-rule py-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="mr-1 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Concept
          </span>
          {allConcepts.map(([tag, count]) => {
            const on = concepts.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleConcept(tag)}
                aria-pressed={on}
                className={`border px-2.5 py-1 text-[0.82rem] transition-colors ${
                  on ? "border-ink bg-ink text-paper" : "border-rule-strong bg-white hover:bg-tint"
                }`}
              >
                {tag}
                <span className={`ml-1.5 tabular-nums ${on ? "text-paper/60" : "text-ink-faint"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="mr-1 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Difficulty
          </span>
          {["intro", "standard", "hard"].map((d) => {
            const on = difficulty === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(on ? null : d)}
                aria-pressed={on}
                className={`border px-2.5 py-1 text-[0.82rem] transition-colors ${
                  on ? "border-ink bg-ink text-paper" : "border-rule-strong bg-white hover:bg-tint"
                }`}
              >
                {d}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPlayableOnly((v) => !v)}
            aria-pressed={playableOnly}
            className={`ml-2 border px-2.5 py-1 text-[0.82rem] transition-colors ${
              playableOnly
                ? "border-ink bg-ink text-paper"
                : "border-rule-strong bg-white hover:bg-tint"
            }`}
          >
            playable now
            <span
              className={`ml-1.5 tabular-nums ${playableOnly ? "text-paper/60" : "text-ink-faint"}`}
            >
              {playableCount}
            </span>
          </button>
          {(concepts.length > 0 || difficulty || playableOnly) && (
            <button
              type="button"
              onClick={() => {
                setConcepts([]);
                setDifficulty(null);
                setPlayableOnly(false);
              }}
              className="ml-1 text-[0.8rem] text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-[0.8rem] text-ink-soft tabular-nums">
        {filtered.length} {filtered.length === 1 ? "problem" : "problems"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 max-w-[52ch] text-[0.95rem] text-ink-soft">
          Nothing matches all of those filters at once. Remove one to widen the search.
        </p>
      ) : (
        <ul className="mt-4 border-t border-rule">
          {filtered.map((p) => (
            <li key={p.id} className="border-b border-rule">
              <Link
                href={`/practice/${p.id}`}
                className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 hover:bg-tint/60"
              >
                <span className="w-16 shrink-0 text-[0.72rem] tracking-wider text-ink-faint tabular-nums">
                  {p.year} · {p.letter}
                </span>
                <span className="min-w-0 flex-1 basis-64">
                  <span className="font-heading text-[1.05rem] text-ink group-hover:underline group-hover:underline-offset-4">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
                    {p.conceptTags.join(" · ")}
                    {p.languages.length > 0 && (
                      <span className="text-ink-faint"> · {p.languages.join(", ")}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-[0.78rem] text-ink-soft tabular-nums">
                  {p.tier !== "full" ? (
                    <span className="text-ink-faint">not yet transcribed</span>
                  ) : progress.problems[p.id]?.solved ? (
                    <span className="text-good">solved</span>
                  ) : (
                    <>
                      {p.questionCount} parts · {p.officialTimeMinutes} min
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
