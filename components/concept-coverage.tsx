"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProblemSummary } from "@/lib/content";
import { coverageByConcept } from "@/lib/progress";

/**
 * Coverage per concept rather than a lifetime point total. For a student
 * cramming in January, "morphology 2/4" is the more useful number.
 */
export function ConceptCoverage({ problems }: { problems: ProblemSummary[] }) {
  const [coverage, setCoverage] = useState<Record<string, { solved: number; total: number }>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setCoverage(coverageByConcept(problems));
    read();
    setReady(true);
    window.addEventListener("gloss:progress", read);
    return () => window.removeEventListener("gloss:progress", read);
  }, [problems]);

  const entries = Object.entries(coverage).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
  );
  if (!ready || entries.length === 0) return null;

  const anySolved = entries.some(([, v]) => v.solved > 0);

  return (
    <section className="mt-14 border-t border-rule pt-8">
      <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {anySolved ? "Your coverage" : "What is in here"}
      </h2>

      <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {entries.map(([tag, { solved, total }]) => (
          <li key={tag} className="flex items-baseline gap-3">
            <span className="flex-1 text-[0.9rem]">{tag}</span>
            <span
              aria-hidden
              className="h-[3px] w-20 shrink-0 bg-rule"
              style={{
                backgroundImage: `linear-gradient(to right, var(--ink) ${(solved / total) * 100}%, transparent ${(solved / total) * 100}%)`,
              }}
            />
            <span className="w-9 shrink-0 text-right text-[0.82rem] text-ink-soft tabular-nums">
              {solved}/{total}
            </span>
          </li>
        ))}
      </ul>

      {!anySolved && (
        <p className="mt-4 text-[0.85rem] text-ink-faint">
          Nothing solved yet.{" "}
          <Link href="/practice" className="underline underline-offset-2 hover:text-ink">
            Pick a concept
          </Link>{" "}
          and the bars fill in.
        </p>
      )}
    </section>
  );
}
