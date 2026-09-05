import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BVC Office Portal",
  description: "Training, SOPs, IT Assets and Office Operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {/* Page transition overlay — eliminates black flash between navigations */}
        <div id="page-transition-overlay" />
        {children}
      </body>
    </html>
  );
}
