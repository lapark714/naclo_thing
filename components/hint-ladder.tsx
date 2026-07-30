"use client";

import type { Hint } from "@/content/schema";

const TIER_LABEL = ["Orientation", "Method", "Partial work"] as const;

type Props = {
  hints: Hint[];
  revealed: number;
  onReveal: (tier: number) => void;
};

/**
 * Three tiers, unlocked in order. The XP cost is shown before the reveal, not
 * after — help is available, but never free, and never a surprise.
 */
export function HintLadder({ hints, revealed, onReveal }: Props) {
  return (
    <section aria-labelledby="hints-heading" className="mt-10">
      <h2
        id="hints-heading"
        className="mb-3 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
      >
        Hints
      </h2>

      <ol className="border-t border-rule">
        {hints.map((hint, i) => {
          const isOpen = revealed >= hint.tier;
          const isNext = revealed === hint.tier - 1;
          return (
            <li key={hint.tier} className="border-b border-rule">
              <div className="flex items-baseline gap-4 py-3">
                <span className="w-4 shrink-0 text-[0.78rem] text-ink-faint tabular-nums">
                  {hint.tier}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span
                      className={`text-[0.82rem] font-semibold ${isOpen ? "text-ink" : "text-ink-soft"}`}
                    >
                      {TIER_LABEL[i] ?? `Tier ${hint.tier}`}
                    </span>
                    {!isOpen && isNext && (
                      <button
                        type="button"
                        onClick={() => onReveal(hint.tier)}
                        className="text-[0.78rem] text-mark underline underline-offset-2 hover:no-underline"
                      >
                        Reveal · −{hint.xpCost} XP
                      </button>
                    )}
                    {!isOpen && !isNext && (
                      <span className="text-[0.78rem] text-ink-faint">
                        Take hint {hint.tier - 1} first
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <p className="mt-1.5 max-w-[62ch] text-[0.92rem] leading-relaxed text-ink">
                      {hint.text}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
