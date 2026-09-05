import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BVC Office Portal",
  description: "Training, SOPs, IT Assets and Office Operations — B V C & Co.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
