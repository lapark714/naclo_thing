import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "morpheme",
  description:
    "Work past NACLO problems by concept, with hints you unlock one at a time.",
};

/**
 * The only theme code that has to run before the browser paints.
 *
 * It is deliberately almost empty. globals.css declares `color-scheme: light
 * dark`, so a student who has never touched the toggle already gets their own
 * machine's setting with no JavaScript involved at all; this exists solely to
 * apply a stored override in the same frame the document parses, before any
 * pixels land. Deferring it by even one frame is what produces the white flash
 * on a dark-mode load, which is the single most recognisable sign of a dark
 * mode that was added rather than designed.
 *
 * It also stamps the resolved value when nothing is stored, so the handful of
 * CSS rules that need to name the theme — the toggle's fill, the screenshot
 * swap — can read one attribute instead of re-deriving the media query. Those
 * rules still carry a prefers-color-scheme branch, so the page is correct with
 * JavaScript switched off entirely.
 */
const THEME_SCRIPT = `try{var s=localStorage.getItem("morpheme.theme.v1");document.documentElement.dataset.theme=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning because the script above writes data-theme onto
    // this element before React sees the document. It is scoped to <html>'s own
    // attributes and does not reach the tree inside.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
