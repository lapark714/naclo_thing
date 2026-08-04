import Link from "next/link";
import { getProblemIndex } from "@/lib/content";
import { HomeDemo } from "@/components/home-demo";

export default function Home() {
  const problems = getProblemIndex();
  const languages = [...new Set(problems.flatMap((p) => p.languages))];

  return (
    // Wider than the 48rem column the reading surfaces use. This page is not
    // read top to bottom, it is scanned and acted on, so at desktop width the
    // pitch and the demo sit side by side instead of stacking into a ribbon
    // with half the screen empty either side of it.
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {/* Split at the real morpheme boundary: morph + the -eme of phoneme,
              grapheme, sememe. The colour lands on a piece of the word that
              means something, so the mark states the idea rather than
              decorating it. */}
          <h1 className="wordmark text-[2.75rem] sm:text-[3.5rem]">
            morph<span className="text-action">eme</span>
          </h1>
          {/* Puzzle first. The casual puzzler will not read past a sentence
              about a contest they have not entered, and the contest student
              loses nothing by meeting the puzzle before its name. */}
          <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink">
            A language you have never seen, but just enough of it to work out
            the rest. That&apos;s the whole game.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
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

          {/* One line doing three jobs, because the page had a paragraph for
              each: where the problems come from, that they are checked, and
              what to do when one is still wrong. */}
          <p className="mt-4 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
            Past problems from NACLO, the linguistics olympiad. Each one is
            transcribed twice and checked against the original PDF. Flag
            anything that still looks wrong.
          </p>
        </div>

        {/* The demo is the argument, so on a wide screen it sits beside the
            pitch rather than under it. Below lg it falls back into the stack,
            still directly after the line that sets it up. */}
        <div className="lg:pt-2">
          <HomeDemo />
        </div>
      </div>

      {/* Bracketed by hairlines rather than boxed: the design system has no
          tinted surfaces, so a rule above and below is what gives this block
          an edge without inventing a card for it. */}
      <section className="mt-16 border-y border-rule py-10 sm:py-12">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          How it works
        </h2>
        <dl className="mt-7 grid gap-x-12 gap-y-9 sm:grid-cols-3">
          <div>
            <dt className="font-heading text-[1.35rem]">Hints cost XP</dt>
            <dd className="mt-2 max-w-[42ch] text-[1rem] leading-relaxed text-ink-soft">
              You may unlock three per problem, in order. The first says where
              to look, while the last works a step through on ungraded data.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.35rem]">Worked explanations</dt>
            <dd className="mt-2 max-w-[42ch] text-[1rem] leading-relaxed text-ink-soft">
              NACLO&rsquo;s own solutions give the answer and skip the
              reasoning. Read the steps a solver takes to get there.
            </dd>
          </div>
          <div>
            <dt className="font-heading text-[1.35rem]">A clock you control</dt>
            <dd className="mt-2 max-w-[42ch] text-[1rem] leading-relaxed text-ink-soft">
              Nothing runs on a timer unless you set one. When it runs out you
              get a banner but your answers keep working.
            </dd>
          </div>
        </dl>
      </section>

      {/* No rule of its own: the section above already closes with one, and a
          second hairline forty pixels below it reads as noise. */}
      <footer className="mt-8 text-[0.78rem] text-ink-soft">
        <p className="max-w-[60ch]">
          Unofficial practice for the North American Computational Linguistics
          Olympiad. We credit the original authors on every problem page. You do
          not need an account, and your browser keeps your progress.
        </p>
      </footer>
    </main>
  );
}
