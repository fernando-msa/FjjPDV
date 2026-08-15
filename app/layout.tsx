import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-sw";

// Grotesca larga e robusta — remete a letreiro de mercado, nao a dashboard SaaS generico.
const fontSans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans"
});

// Reservada para numeros: precos, totais e o visor da registradora.
const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: {
    default: "FjjPDV",
    template: "%s | FjjPDV"
  },
  description: "PDV offline-first com Next.js, Supabase e IndexedDB.",
  manifest: "/manifest.webmanifest",
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
      <head>
        <meta name="theme-color" content="#1b1712" />
      </head>
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}