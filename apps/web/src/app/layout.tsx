import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "VOTO | The regulatory intelligence layer for crypto",
  description:
    "VOTO helps serious crypto teams check legitimacy, regulatory status, warning signals, and sanctions exposure through source-backed intelligence and API-first workflows.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-[var(--font-body)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
