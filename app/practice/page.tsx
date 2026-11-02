import type { Metadata } from "next";
import Link from "next/link";
import { getProblemIndex, getUpcoming } from "@/lib/content";
import { ConceptFilter } from "@/components/concept-filter";
import { ComingSoon } from "@/components/coming-soon";
import { ConceptMastery } from "@/components/concept-mastery";

export const metadata: Metadata = {
  title: "Practice · morpheme",
  description: "Filter NACLO problems by concept and difficulty.",
};

export default function PracticePage() {
  const problems = getProblemIndex();
  const upcoming = getUpcoming();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      {/* The back link already owned this row and had the whole width to
          itself. The theme control takes the end of it rather than adding a
          bar: this world has no navigation chrome and should not grow any. */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-[0.8rem] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          ← morpheme
        </Link>
      </div>

      <h1 className="section-head font-heading mt-6 text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">Practice</h1>
      <p className="mt-2 max-w-[56ch] text-[0.95rem] text-ink-soft">
        Pick a concept and work problems of that type. Filters stack.
      </p>

      {/* Above the library, not below it. This is the answer to "what do I
          work on next", and under forty-one problem rows nobody ever saw it. */}
      <div className="mt-8">
        <ConceptMastery problems={problems} />
      </div>

      <div className="mt-7">
        <ConceptFilter problems={problems} />
      </div>

      <ComingSoon upcoming={upcoming} />
    </main>
  );
}
