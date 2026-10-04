import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseTrace — Website Performance & Load Analysis",
  description:
    "Enter any URL. Discover endpoints via robots.txt and sitemap.xml, simulate 1000 virtual users, and get a detailed performance report with latency percentiles, RPS, error rate, and availability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
