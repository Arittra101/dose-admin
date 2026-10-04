import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { Footer } from "@/components/Footer";

import "./globals.css";

// Fraunces is the brand display face — every heading and every large number.
// The `opsz` axis is what makes it work at both 11px and 38px, so we load it
// variable rather than at fixed weights.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  // Variable weight (no `weight` key) is required to request an extra axis —
  // next/font rejects `axes` alongside a fixed weight list. We want it
  // variable anyway: the opsz axis is what lets Fraunces work at both 18px
  // and 32px without looking like two different typefaces.
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dose Care — Admin",
  description: "User and plan operations for Dose Care.",
  // The whole app is an operator tool. There is no page here that should
  // ever appear in a search result.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      {/* The column is header + content + footer. Whatever `children`
          renders claims the middle with `flex-1`, which is what keeps the
          footer at the bottom of a short page without pinning it over a
          long one. */}
      <body className="flex min-h-svh flex-col">
        {children}
        <Footer />
      </body>
    </html>
  );
}
