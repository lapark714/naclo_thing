import type { Upcoming } from "@/lib/content";

/**
 * The queue, stated once at the foot of the list rather than spelled out row by
 * row. Catalogue entries used to sit in the list itself marked "not yet
 * transcribed", which padded the archive with rows a student cannot work and
 * buried the ones they can.
 */
export function ComingSoon({ upcoming }: { upcoming: Upcoming }) {
  if (upcoming.total === 0) return null;

  return (
    <section className="mt-14 border-t border-rule pt-8">
      <h2 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        More problems coming soon
      </h2>

      <p className="mt-3 max-w-[58ch] text-[0.95rem] leading-relaxed text-ink-soft">
        {upcoming.total} more are on the way. Each one gets transcribed by hand and
        checked against the official solution before it goes up, so they arrive a
        few at a time. Until then you can work them from the original booklets at{" "}
        <a
          href="https://naclo.org/practice.php"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          naclo.org
        </a>
        .
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[0.82rem]">
        {upcoming.byYear.map(({ year, count }) => (
          <div key={year} className="flex items-baseline gap-1.5">
            <dt className="text-ink tabular-nums">{year}</dt>
            <dd className="text-ink-soft tabular-nums">
              {count} {count === 1 ? "problem" : "problems"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
