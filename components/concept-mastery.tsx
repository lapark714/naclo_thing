"use client";

import { useProgress, masteryByConcept } from "@/lib/progress";
import type { ProblemSummary } from "@/lib/content";

/**
 * Points earned against points available, one row per concept.
 *
 * Until this existed, every mention of points on the site was a deduction: hints
 * cost it, revealing an answer zeroed it, and nothing ever showed a student
 * what they had. `xpEarned` was written on every solve and read nowhere, so
 * the currency had a price list and no balance.
 *
 * The bar is ink on rule, not the action colour. Action means action and
 * brand; a progress readout is neither, and a row of orange bars would read
 * as decoration on a page whose job is choosing what to work on next.
 */
export function ConceptMastery({ problems }: { problems: ProblemSummary[] }) {
  const progress = useProgress();
  const mastery = masteryByConcept(problems, progress);

  const rows = Object.entries(mastery)
    .filter(([, m]) => m.available > 0)
    .sort((a, b) => b[1].earned - a[1].earned || a[0].localeCompare(b[0]));

  // Nothing to show a student who has not started. An all-empty table above
  // the problem list is the same noise the landing page had: it answers a
  // question nobody has asked yet, and it pushes the actual problems down.
  if (rows.length === 0 || !rows.some(([, m]) => m.earned > 0)) return null;

  return (
    <section aria-labelledby="mastery-heading" className="mb-10 border-b border-rule pb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="mastery-heading"
          className="text-[0.72rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
        >
          Your mastery
        </h2>
        <p className="text-[0.78rem] text-ink-faint">
          Hints come out of what a problem is worth, so the gap is what help
          cost you.
        </p>
      </div>

      <dl className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {rows.map(([tag, m]) => {
          const pct = Math.round((m.earned / m.available) * 100);
          return (
            <div key={tag}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[0.85rem] text-ink">{tag}</dt>
                <dd className="text-[0.78rem] text-ink-soft tabular-nums">
                  <span className="font-semibold text-ink">{m.earned}</span>
                  {" / "}
                  {m.available} points
                  <span className="text-ink-faint">
                    {" · "}
                    {m.solved}/{m.total}
                  </span>
                </dd>
              </div>
              {/* A track that always shows its full width, so an empty concept
                  reads as room to fill rather than as nothing there. */}
              <div
                className="mt-1.5 h-[3px] w-full bg-rule"
                role="img"
                aria-label={`${tag}: ${m.earned} of ${m.available} points earned`}
              >
                <div
                  className="h-full bg-ink"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
