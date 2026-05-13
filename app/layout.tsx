import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Spend Audit",
  description: "Find plan-fit, duplicate-tool, and discounted-credit savings in a startup AI stack.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "AI Spend Audit",
    description: "Benchmark your AI tool spend and find defensible savings.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI Spend Audit",
    description: "Benchmark your AI tool spend and find defensible savings.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
