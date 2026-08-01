import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gloss.",
  description:
    "Work past NACLO problems by concept, with hints you unlock one at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
