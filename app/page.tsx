import Link from "next/link";
import Image from "next/image";
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
    <main className="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pt-8 sm:pb-24">
      {/* The one page with no back link, so the control gets its own line.
          Top padding comes off to pay for it: the wordmark should still open
          the page, not sit under a header. */}
      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {/* Split at the real morpheme boundary: morph + the -eme of phoneme,
              grapheme, sememe. The colour lands on a piece of the word that
              means something, so the mark states the idea rather than
              decorating it.

              Both halves are brand now, one hue each, where morph used to be
              plain ink. WCAG 1.4.3 exempts text that is part of a logo, which
              is what lets the cyan run at 2.63:1 here and nowhere else on the
              site — every other cyan that sets type is --good-deep. */}
          <h1 className="wordmark text-[2.75rem] sm:text-[3.5rem]">
            <span className="text-good">morph</span>
            <span className="text-action">eme</span>
          </h1>
          {/* Puzzle first. The casual puzzler will not read past a sentence
              about a contest they have not entered, and the contest student
              loses nothing by meeting the puzzle before its name. */}
          <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-ink">
            A language you have never seen, but just enough of it to work out
            the rest. That&apos;s the whole game.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* One label over a sweeping fill. This carried two stacked
                copies while the wipe was ink: paper on the orange is 2.13:1
                and ink on it 9.88:1, so no single label could cross the
                transition readable. Both fills take the same black label now
                — 9.88:1 on the orange, 7.98:1 on the cyan — so the duplicate
                went with the ink. The fill sits behind, clipped from the
                left; see .ink-wipe in globals.css. */}
            <Link
              href="/practice"
              className="ink-wipe font-cta bg-action border-good relative inline-flex items-center border-2 px-8 py-4 text-[0.85rem] font-bold tracking-[0.12em] whitespace-nowrap text-on-action uppercase"
            >
              <span
                aria-hidden="true"
                className="ink-wipe-fill bg-good absolute -inset-0.5"
              />
              <span className="relative">Start practicing</span>
            </Link>
            <span className="font-cta text-[0.85rem] text-ink-soft">
              <span className="font-semibold text-ink tabular-nums">
                {problems.length}
              </span>{" "}
              problems,{" "}
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
            Past problems from the North American Computational Linguistics Olympiad, NACLO. Each one is
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
        {/* A headline rather than the small uppercase label the product uses
            for QUESTIONS and EXPLANATION. Those label a working surface; this
            heads a pitch, on the one page that already carries a 3.5rem
            wordmark. The label style stays everywhere else. */}
        <h2 className="section-head section-head-center font-heading text-center text-[2.25rem] leading-[1.25] tracking-[-0.015em]">
          How It Works
        </h2>
        {/* Real screenshots, all cropped to the same window on a live problem
            page, so the three read as one app rather than three mockups. They
            go stale if that UI moves: recapture rather than redraw.
            Each ships as a pair, captured from the same scroll position with
            the clock stopped so only the theme differs between them — the
            plate must not reframe under a reader who flips the toggle. */}
        <dl className="mt-10 grid gap-y-10">
          {[
            {
              title: "Hints Cost Points",
              body: "Three hints per problem, unlocked in order. The first points you to the right part of the data; the last walks a full step through on examples that aren't graded. Each one is generated against the official NACLO solution key.",
              src: "/how/hints.png",
              alt: "A help panel open over a Kogi matching question, listing three hints. The first offers to reveal for one point, the other two are locked, and a line below says hints never give the answer.",
            },
            {
              title: "Worked Explanations",
              body: "NACLO's answer keys give the answer and skip the reasoning. Deriving each one by hand was never realistic, so this is a pipeline for it. Conditioned on the official solution, a language model back-chains to recover the inferences that yield it, then orders them forward, the way a solver would.",
              src: "/how/explanation.png",
              alt: "A written walkthrough that breaks a Kogi phrase into a root and three grammar slots, with a table pairing each slot to its form and meaning.",
            },
            {
              title: "A Clock You Control",
              body: "The real exam is timed, but early practice shouldn't be. Nothing here runs on a clock unless you start one. When it does run out you get a banner and nothing else, so your answers keep working, and the problem stays open as long as you want it.",
              src: "/how/timer.png",
              alt: "A timer at the top of a problem reading thirteen minutes fifty-six seconds left, with a Stop link beside it and the problem text below.",
            },
          ].map((item) => (
            // grid-rows-[auto_1fr] is load-bearing: a row-span-2 item taller
            // than its tracks otherwise splits the excess between them, which
            // opens an unexplained gap between the term and its definition.
            // items-start likewise, or the bordered image stretches and draws
            // white space under the screenshot whenever the text runs longer.
            <div
              key={item.title}
              className="grid gap-x-12 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start"
            >
              {/* .plate carries the hover lift. See globals.css: at rest it
                  is flat and ruled like everything else, and the rise is what
                  earns the shadow. */}
              <div className="plate mb-4 border border-rule bg-surface sm:max-w-[380px] lg:row-span-2 lg:mb-0">
                {/* One capture. This rendered a light/dark pair until the
                    dark theme was withdrawn, with CSS hiding the twin rather
                    than a <picture> media query, because <picture> can only
                    read the machine's setting. They go stale if the UI moves:
                    recapture rather than redraw. */}
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={760}
                  height={432}
                  sizes="(min-width: 640px) 380px, calc(100vw - 40px)"
                  className="block h-auto w-full"
                />
              </div>
              <dt className="font-heading text-[1.35rem]">{item.title}</dt>
              <dd className="mt-2 max-w-[58ch] text-[1rem] leading-relaxed text-ink-soft">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* No rule of its own: the section above already closes with one, and a
          second hairline forty pixels below it reads as noise. */}
      <footer className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 text-[0.78rem] text-ink-soft">
        <div>
          <p className="max-w-[60ch]">
            Unofficial practice for the North American Computational Linguistics
            Olympiad. We credit the original authors on every problem page. You
            do not need an account, and your browser keeps your progress.
          </p>
          {/* The site is unofficial, so the line above disclaims NACLO's
              problems while this one claims only the site around them. */}
          <p className="mt-2 text-ink-faint">
            &copy; {new Date().getFullYear()} Laurence Park
          </p>
        </div>

        <a
          href="mailto:lapark@stanford.edu"
          className="shrink-0 border border-rule-strong bg-surface px-4 py-2 text-[0.75rem] font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:border-ink"
        >
          Contact
        </a>
      </footer>
    </main>
  );
}
