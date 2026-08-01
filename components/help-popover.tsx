"use client";

import { useEffect, useRef, useState } from "react";
import type { Hint } from "@/content/schema";

/**
 * Help, anchored to the part it belongs to. A student stuck on A3 should not
 * have to scroll to the bottom of the page to discover that help exists.
 *
 * Order inside: the written hints first, because they are reviewed and
 * instant, then AI help for the case they do not cover, then the answer.
 */

type Props = {
  problemId: string;
  part: string;
  hints: Hint[];
  hintsRevealed: number;
  onRevealHint: (tier: number) => void;
  aiHintsUsed: number;
  onAiHint: () => void;
  onRevealPart: () => void;
  partRevealed: boolean;
};

const TIER_LABEL = ["Where to look", "The idea", "One step worked"] as const;
const AI_HINT_COST = 2;

export function HelpPopover({
  problemId,
  part,
  hints,
  hintsRevealed,
  onRevealHint,
  aiHintsUsed,
  onAiHint,
  onRevealPart,
  partRevealed,
}: Props) {
  const [open, setOpen] = useState(false);
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "hint" | "explain">(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function ask(mode: "hint" | "explain") {
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, part, mode, escalation: aiHints.length }),
      });
      const body = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !body.text) {
        setError(body.error ?? "Could not reach the helper.");
        return;
      }
      if (mode === "hint") {
        setAiHints((prev) => [...prev, body.text!]);
        onAiHint();
      } else {
        setExplanation(body.text);
      }
    } catch {
      setError("Could not reach the helper. The written hints still work.");
    } finally {
      setBusy(null);
    }
  }

  const spent =
    hints.filter((h) => h.tier <= hintsRevealed).reduce((n, h) => n + h.xpCost, 0) +
    aiHintsUsed * AI_HINT_COST;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 border px-2 py-1 text-[0.72rem] font-semibold tracking-wide uppercase transition-colors ${
          open
            ? "border-ink bg-ink text-paper"
            : "border-rule-strong bg-white text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        Hint
        {spent > 0 && (
          <span className={open ? "text-paper/70" : "text-mark"} aria-label={`${spent} XP spent`}>
            −{spent}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Help for part ${part}`}
          className="absolute top-full right-0 z-30 mt-1.5 w-[min(23rem,calc(100vw-2.5rem))] border border-ink bg-white p-4 shadow-[0_8px_28px_-12px_rgba(22,24,29,0.35)]"
        >
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Help with {part}
          </p>

          {/* Written hints — reviewed, instant, same for everyone. */}
          <ol className="mt-3 border-t border-rule">
            {hints.map((hint, i) => {
              const isOpen = hintsRevealed >= hint.tier;
              const isNext = hintsRevealed === hint.tier - 1;
              return (
                <li key={hint.tier} className="border-b border-rule py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[0.8rem] font-semibold ${isOpen ? "text-ink" : "text-ink-soft"}`}
                    >
                      {hint.tier}. {TIER_LABEL[i] ?? `Hint ${hint.tier}`}
                    </span>
                    {!isOpen &&
                      (isNext ? (
                        <button
                          type="button"
                          onClick={() => onRevealHint(hint.tier)}
                          className="shrink-0 text-[0.75rem] text-mark underline underline-offset-2 hover:no-underline"
                        >
                          Reveal · −{hint.xpCost} XP
                        </button>
                      ) : (
                        <span className="shrink-0 text-[0.72rem] text-ink-faint">locked</span>
                      ))}
                  </div>
                  {isOpen && (
                    <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink">{hint.text}</p>
                  )}
                </li>
              );
            })}
          </ol>

          {/* AI help, for when the written ladder has run out. */}
          <div className="mt-3">
            {aiHints.map((text, i) => (
              <p
                key={i}
                className="mb-2 border-l-2 border-mark pl-3 text-[0.85rem] leading-relaxed text-ink"
              >
                {text}
              </p>
            ))}

            {explanation && (
              <div className="mb-2 border-l-2 border-rule-strong pl-3">
                <p className="mb-1 text-[0.7rem] font-semibold tracking-[0.1em] text-ink-soft uppercase">
                  In plain words
                </p>
                {explanation.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className="mb-1.5 text-[0.85rem] leading-relaxed text-ink">
                    {para}
                  </p>
                ))}
              </div>
            )}

            {error && <p className="mb-2 text-[0.8rem] text-mark">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => ask("hint")}
                disabled={busy !== null || aiHints.length >= 3}
                className="border border-rule-strong px-2.5 py-1 text-[0.75rem] hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "hint"
                  ? "Thinking…"
                  : aiHints.length >= 3
                    ? "No more hints"
                    : `Ask for a hint · −${AI_HINT_COST} XP`}
              </button>
              <button
                type="button"
                onClick={() => ask("explain")}
                disabled={busy !== null}
                className="border border-rule-strong px-2.5 py-1 text-[0.75rem] hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "explain" ? "Writing…" : "Explain in plain words"}
              </button>
            </div>
            <p className="mt-1.5 text-[0.7rem] text-ink-faint">
              Hints never give the answer. Explaining is free.
            </p>
          </div>

          {/* The exit hatch. Costs the part's XP, and says so. */}
          <div className="mt-3 border-t border-rule pt-3">
            {partRevealed ? (
              <p className="text-[0.78rem] text-ink-soft">
                Answers for {part} are shown. This part scores 0 XP.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onRevealPart();
                  setOpen(false);
                }}
                className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Show me the answers for {part} · 0 XP for this part
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
