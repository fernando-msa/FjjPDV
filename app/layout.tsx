import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-sw";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: {
    default: "FjjPDV",
    template: "%s | FjjPDV"
  },
  description: "PDV offline-first com Next.js, Supabase e IndexedDB.",
  manifest: "/manifest.webmanifest",
  themeColor: "#08101f",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}