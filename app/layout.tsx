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
 * It is deliberately almost empty, and it does nothing at all on a first
 * visit. globals.css declares `color-scheme: light`, so the site opens light
 * for everyone; this exists solely to apply a stored override in the same
 * frame the document parses, before any pixels land. Deferring it by even one
 * frame is what produces the black flash on a dark-mode load, which is the
 * single most recognisable sign of a dark mode that was added rather than
 * designed.
 *
 * Nothing is stamped when nothing is stored. The handful of CSS rules that
 * name the theme — the toggle's fill, the screenshot swap — each carry the
 * unset case in their light branch, so the page is correct on a first visit
 * and with JavaScript switched off entirely.
 */
const THEME_SCRIPT = `try{var s=localStorage.getItem("morpheme.theme.v1");if(s==="light"||s==="dark")document.documentElement.dataset.theme=s}catch(e){}`;

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
