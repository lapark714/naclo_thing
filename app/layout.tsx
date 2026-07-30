import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gloss.",
  description:
    "Practice the NACLO back catalogue by concept, with hints, worked explanations, and a clock you control.",
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
