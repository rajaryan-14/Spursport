import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPURSCOPE",
  description: "Predict, simulate and explain Tottenham Hotspur matches."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
