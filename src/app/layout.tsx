import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErudaDebug } from "@/components/eruda-debug";
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
  title: "Grimgar Reader - Đọc truyện tiến độ",
  description: "Ứng dụng đọc truyện Grimgar với đánh dấu tiến độ",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        {children}
        <ErudaDebug />
      </body>
    </html>
  );
}
