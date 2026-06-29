import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-1 rounded-full bg-blue-700" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  BVC Office Portal
                </h1>
                <p className="text-xs text-slate-500">
                  Training • SOPs • IT Assets • Office Operations
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">
              <img
                src="/logo.png"
                alt="B V C & Co. Logo"
                className="h-14 object-contain"
              />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-78px)] max-w-7xl px-5 py-4 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
