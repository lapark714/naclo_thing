import type { Metadata } from "next";
import Link from "next/link";
import { getProblemIndex } from "@/lib/content";
import { ConceptFilter } from "@/components/concept-filter";

export const metadata: Metadata = {
  title: "Practice · gloss.",
  description: "Filter NACLO problems by concept and difficulty.",
};

export default function PracticePage() {
  const problems = getProblemIndex();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/"
        className="text-[0.8rem] text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        ← gloss.
      </Link>

      <h1 className="font-heading mt-6 text-3xl leading-tight sm:text-4xl">Practice</h1>
      <p className="mt-2 max-w-[56ch] text-[0.95rem] text-ink-soft">
        Pick a concept and work problems of that type. Filters stack.
      </p>

      <div className="mt-7">
        <ConceptFilter problems={problems} />
      </div>
    </main>
  );
}
