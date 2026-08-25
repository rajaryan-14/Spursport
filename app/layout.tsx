import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SPURSCOPE — Tottenham analytics",
    template: "%s · SPURSCOPE"
  },
  description: "Predict matches, simulate the Premier League season and explain the numbers behind Tottenham Hotspur.",
  keywords: ["Tottenham Hotspur", "Spurs", "football analytics", "Premier League predictions"],
  icons: { icon: "/spurs-logo.png" },
  openGraph: {
    title: "SPURSCOPE — Tottenham analytics",
    description: "Predict, simulate and explain the numbers behind Spurs.",
    type: "website",
    siteName: "SPURSCOPE"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
