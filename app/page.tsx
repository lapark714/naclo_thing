import Link from "next/link";
import { getProblemIndex } from "@/lib/content";
import { ConceptCoverage } from "@/components/concept-coverage";

export default function Home() {
  const problems = getProblemIndex();
  const languages = [...new Set(problems.flatMap((p) => p.languages))];

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="font-heading text-5xl leading-none sm:text-6xl">gloss.</h1>
      <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink">
        Work past NACLO problems by concept. Ask for a hint instead of falling back on the full
        solution.
      </p>

      <p className="mt-4 max-w-[54ch] text-[0.95rem] leading-relaxed text-ink-soft">
        NACLO puts its past exams online as PDFs. You cannot search them or filter for one kind
        of problem, and when you get stuck your only option is to read the whole solution.
      </p>

      <section className="mt-10">
        <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          How it works
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-7 sm:grid-cols-3">
          <div>
            <dt className="font-heading text-[1.05rem]">Hints cost XP</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              You unlock three per problem, in order. The first says where to look, the last works a
              step through on ungraded data. You see the cost before you spend.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">Worked explanations</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              NACLO&rsquo;s own solutions give the answer and skip the reasoning. Read the steps a
              solver takes to get there.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">A clock you control</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Nothing runs on a timer unless you set one. When it runs out you get a banner and
              your answers keep working.
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-5">
        <Link
          href="/practice"
          className="inline-flex items-center border border-ink bg-ink px-8 py-4 text-[0.85rem] font-semibold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-paper hover:text-ink"
        >
          Start practicing
        </Link>
        <span className="text-[0.85rem] text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">{problems.length}</span> problems ·{" "}
          <span className="font-semibold text-ink tabular-nums">{languages.length}</span> languages
        </span>
      </div>

      <ConceptCoverage problems={problems} />

      <footer className="mt-10 border-t border-rule pt-6 text-[0.8rem] text-ink-soft">
        <p className="max-w-[60ch]">
          Unofficial practice for the North American Computational Linguistics Olympiad.
          We credit the original authors on every problem page. You do not need an account, and
          your browser keeps your progress.
        </p>
      </footer>
    </main>
  );
}
