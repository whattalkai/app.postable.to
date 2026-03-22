import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhatTalk Studio — Yapay Zeka İçerik Stüdyosu",
  description: "WhatTalk.ai yapay zeka ajanları ile sosyal medya kreatifleri üretin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
