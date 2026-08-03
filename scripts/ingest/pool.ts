/**
 * Bounded-concurrency map. 58 problems at two passes each is 116 API calls;
 * sequentially that is most of a day, at four concurrent it is about an hour.
 * Four is the cap because these requests carry several full-page images and
 * higher rates trip the API's limits.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  );
  return results;
}
