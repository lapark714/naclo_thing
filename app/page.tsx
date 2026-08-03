import Link from "next/link";
import { getProblemIndex } from "@/lib/content";
import { ConceptCoverage } from "@/components/concept-coverage";
import { HomeDemo } from "@/components/home-demo";

export default function Home() {
  const problems = getProblemIndex();
  const languages = [...new Set(problems.flatMap((p) => p.languages))];

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      {/* Split at the real morpheme boundary: morph + the -eme of phoneme,
          grapheme, sememe. The colour lands on a piece of the word that means
          something, so the mark states the idea rather than decorating it. */}
      <h1 className="wordmark text-[2.75rem] sm:text-[3.5rem]">
        morph<span className="text-action">eme</span>
      </h1>
      {/* Puzzle first. The casual puzzler will not read past a sentence about
          a contest they have not entered, and the contest student loses nothing
          by meeting the puzzle before its name. */}
      <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink">
        A language you have never seen, and just enough of it to work out the
        rest. That&apos;s the whole game.
      </p>

      <p className="mt-4 max-w-[54ch] text-[0.95rem] leading-relaxed text-ink-soft">
        The problems come from NACLO, the North American Computational
        Linguistics Olympiad, which publishes its past exams as PDFs you cannot
        search or filter. Here they are transcribed, sorted by what each one
        teaches, and fitted with hints you unlock one at a time instead of
        jumping to the answer.
      </p>

      <HomeDemo />

      {/* Above the explainer, not below it: on a phone the old order put the
          primary action a full screen down, behind copy that is reassurance
          rather than the ask. */}
      <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/practice"
          className="bg-action border-action hover:bg-action-hover hover:border-action-hover inline-flex items-center border px-8 py-4 text-[0.85rem] font-semibold tracking-[0.12em] text-ink uppercase transition-colors"
        >
          Start practicing
        </Link>
        <span className="text-[0.85rem] text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">
            {problems.length}
          </span>{" "}
          problems ·{" "}
          <span className="font-semibold text-ink tabular-nums">
            {languages.length}
          </span>{" "}
          languages
        </span>
      </div>

      {/* The guarantee, where it reassures. It used to sit in the second
          sentence of the page, which sold a process detail as a headline. */}
      <p className="mt-4 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
        Hints and explanations are drafted with AI, then checked by a person
        against NACLO&rsquo;s official solution before anything goes up.
      </p>

      <section className="mt-12">
        <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          How it works
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-7 sm:grid-cols-3">
          <div>
            <dt className="font-heading text-[1.05rem]">Hints cost XP</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              You unlock three per problem, in order. The first says where to
              look, the last works a step through on ungraded data. You see the
              cost before you spend.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">Worked explanations</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              NACLO&rsquo;s own solutions give the answer and skip the
              reasoning. Read the steps a solver takes to get there.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.05rem]">A clock you control</dt>
            <dd className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
              Nothing runs on a timer unless you set one. When it runs out you
              get a banner and your answers keep working.
            </dd>
          </div>
        </dl>
      </section>

      <ConceptCoverage problems={problems} />

      <footer className="mt-10 border-t border-rule pt-6 text-[0.8rem] text-ink-soft">
        <p className="max-w-[60ch]">
          Unofficial practice for the North American Computational Linguistics
          Olympiad. We credit the original authors on every problem page. You do
          not need an account, and your browser keeps your progress.
        </p>
      </footer>
    </main>
  );
}
