import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "morpheme",
  description:
    "Work past NACLO problems by concept, with hints you unlock one at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No suppressHydrationWarning and no pre-paint script: nothing writes to
    // <html> before React sees it any more. globals.css declares
    // `color-scheme: light` and that is the whole of the theme.
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
