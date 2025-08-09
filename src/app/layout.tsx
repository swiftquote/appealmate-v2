import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AppealMate v2 - UK Parking Ticket Appeal Generator",
  description: "Beat UK PCNs and parking fines with AI-powered appeal letters. Upload your ticket and let our smart system generate the perfect defence.",
  keywords: ["parking ticket", "PCN", "parking fine", "appeal", "UK", "AI", "defence"],
  authors: [{ name: "AppealMate Team" }],
  openGraph: {
    title: "AppealMate v2 - UK Parking Ticket Appeal Generator",
    description: "Beat UK PCNs and parking fines with AI-powered appeal letters",
    siteName: "AppealMate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppealMate v2 - UK Parking Ticket Appeal Generator",
    description: "Beat UK PCNs and parking fines with AI-powered appeal letters",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
