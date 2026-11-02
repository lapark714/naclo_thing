import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProblem,
  getPublishedProblems,
  toClientQuestions,
} from "@/lib/content";
import { ProblemView } from "@/components/problem-view";
import { ReadingProgress } from "@/components/reading-progress";

export function generateStaticParams() {
  return getPublishedProblems().map((p) => ({ problemId: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ problemId: string }>;
}): Promise<Metadata> {
  const { problemId } = await params;
  const problem = getProblem(problemId);
  if (!problem) return { title: "Problem not found" };
  return {
    title: `${problem.title} · morpheme`,
    description: `NACLO ${problem.year} ${problem.round} round, problem ${problem.letter}. ${problem.conceptTags.join(", ")}.`,
  };
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
  const problem = getProblem(problemId);
  if (!problem) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <ReadingProgress />
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/practice"
          className="text-[0.8rem] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          ← All problems
        </Link>
      </div>

      <header className="mt-6 border-b border-ink pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-ink-soft uppercase">
          {problem.year} · {problem.round} round · {problem.letter}
          <span className="text-ink-faint">
            {" "}
            · {problem.officialPoints} points
          </span>
        </p>
        <h1 className="section-head font-heading mt-2 text-3xl leading-tight tracking-[-0.015em] sm:text-4xl">
          {problem.title}
        </h1>
        <p className="mt-2 text-[0.88rem] text-ink-soft">
          {problem.authors.length > 0 && <>{problem.authors.join(" & ")} · </>}
          <span className="text-ink-faint">
            {problem.conceptTags.join(" · ")} · {problem.formTag}
          </span>
        </p>
      </header>

      {problem.tier !== "full" ? (
        <div className="mt-7 border border-rule bg-surface px-5 py-5">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Not yet transcribed
          </p>
          <p className="mt-2 max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-soft">
            This problem is in the catalogue so you can find it by concept, but
            nobody has transcribed it for practice yet. Transcribing one means
            checking every data table cell by cell by hand, so we add them a few
            at a time.
          </p>
          <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-soft">
            You can still work it from the original booklet.
          </p>
          <a
            href={problem.sourcePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block border border-ink px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-ink hover:text-paper"
          >
            Open the {problem.year} booklet
          </a>
        </div>
      ) : (
        <div className="mt-7">
          <ProblemView
            problemId={problem.id}
            bodyHtml={problem.bodyHtml}
            questions={toClientQuestions(problem)}
            hints={problem.hints}
            explanationHtml={problem.explanationHtml}
            officialPoints={problem.officialPoints}
          />
        </div>
      )}

      <footer className="mt-12 border-t border-rule pt-5 text-[0.8rem] text-ink-soft">
        <p>
          {problem.authors.length > 0
            ? `Problem by ${problem.authors.join(" & ")} for the North American Computational Linguistics Open Competition, ${problem.year}.`
            : `From the North American Computational Linguistics Open Competition, ${problem.year}. The author is credited in the original booklet.`}{" "}
          Reproduced for practice.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4">
          <a
            href={problem.sourcePdfUrl}
            className="underline underline-offset-2 hover:text-ink"
            target="_blank"
            rel="noopener noreferrer"
          >
            Find the original on naclo.org
          </a>
        </p>
      </footer>
    </article>
  );
}
