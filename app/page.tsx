import Link from "next/link";
import { getProblemIndex } from "@/lib/content";
import { ConceptCoverage } from "@/components/concept-coverage";

export default function Home() {
  const problems = getProblemIndex();
  const languages = [...new Set(problems.flatMap((p) => p.languages))];

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="font-heading text-5xl leading-none sm:text-6xl">gloss.</h1>
      <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink-soft">
        Practice the NACLO back catalogue by concept, with graduated hints, worked explanations,
        and a clock you control.
      </p>

      <p className="mt-4 max-w-[54ch] text-[0.95rem] leading-relaxed text-ink-soft">
        NACLO publishes its past exams and practice problems as PDFs. Everything you need is available but difficult to use: you cannot search it, you cannot filter it, and when you get stuck
        your only options are to keep staring or read the whole answer. This is your solution.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/practice"
          className="border border-ink px-5 py-2.5 text-[0.8rem] font-semibold tracking-[0.1em] uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Start practising
        </Link>
        <span className="text-[0.85rem] text-ink-soft tabular-nums">
          {problems.length} problems · {languages.length} languages
        </span>
      </div>

      <ConceptCoverage problems={problems} />

      <section className="mt-16 border-t border-rule pt-8">
        <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          How it works
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="font-heading text-[1.05rem]">Hints cost XP</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Three per problem, unlocked in order. The first points you somewhere, the last works
              a step through. You see the cost before you spend it.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">Explanations, not keys</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              NACLO&rsquo;s solutions give the answer and rarely the reasoning. Every problem here
              carries the path a solver would actually take.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">A clock you control</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Untimed by default. Set a limit if you want to practise pacing — when it runs out you
              get a banner, not a locked screen.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mt-16 border-t border-rule pt-6 text-[0.8rem] text-ink-soft">
        <p className="max-w-[60ch]">
          Unofficial practice for the North American Computational Linguistics Open Competition. All
          problems are the work of their original authors and are credited on every page. No account,
          no sign-up — your progress is stored in this browser.
        </p>
      </footer>
    </main>
  );
}
