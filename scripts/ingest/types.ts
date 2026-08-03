/** One thing the pipeline could not vouch for on its own. */
export type Flag = {
  kind: "diff" | "witness" | "figure" | "font";
  /** Addresses the disputed value: "q:A1.a:key", "cell:12", "data:3". */
  path: string;
  /** Pass A's value, where there is one. */
  a?: string;
  /** Pass B's value, where there is one. */
  b?: string;
  note?: string;
};
