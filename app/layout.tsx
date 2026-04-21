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
  title: "Article / Employee Onboarding Portal",
  description: "Onboarding system",
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
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
            <div className="flex items-center gap-4">
              <div className="h-11 w-1 rounded-full bg-blue-700" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Article / Employee Onboarding Portal
                </h1>
                <p className="text-sm text-slate-500">
                  Welcome to your onboarding workspace
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="h-24 object-contain"
              />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-110px)] max-w-7xl px-6 py-10 lg:px-10">
          {children}
        </main>
      </body>
    </html>
  );
}