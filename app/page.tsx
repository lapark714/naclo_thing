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
        Past NACLO problems you can search by concept, with hints that stop short of the answer.
      </p>

      <p className="mt-4 max-w-[54ch] text-[0.95rem] leading-relaxed text-ink-soft">
        NACLO posts its past exams as PDFs. Everything is in there, but you cannot search them,
        you cannot pick out one kind of problem, and when you get stuck the only thing left to do
        is read the full solution. Here you get a nudge first.
      </p>

      <section className="mt-10">
        <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          How it works
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="font-heading text-[1.05rem]">Hints cost XP</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Three per problem, unlocked in order. The first says where to look. The last works
              through a step on data you are not being graded on. You see the cost before you spend.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">Explanations, not keys</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              NACLO&rsquo;s own solutions give the answer and rarely the reasoning. Every problem
              here walks through how you would get there.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">A clock you control</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Untimed unless you ask for a timer. If one runs out you get a banner, not a locked
              screen, and your answers keep working.
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-5">
        <Link
          href="/practice"
          className="inline-flex items-center bg-ink px-8 py-4 text-[0.85rem] font-semibold tracking-[0.12em] text-paper uppercase shadow-[4px_4px_0_0_var(--rule-strong)] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--rule-strong)]"
        >
          Start practicing
        </Link>
        <span className="text-[0.85rem] text-ink-soft tabular-nums">
          {problems.length} problems · {languages.length} languages
        </span>
      </div>

      <ConceptCoverage problems={problems} />

      <footer className="mt-16 border-t border-rule pt-6 text-[0.8rem] text-ink-soft">
        <p className="max-w-[60ch]">
          Unofficial practice for the North American Computational Linguistics Open Competition.
          All problems are the work of their original authors and are credited on every page. No
          account and no sign-up. Your progress is stored in this browser.
        </p>
      </footer>
    </main>
  );
}
