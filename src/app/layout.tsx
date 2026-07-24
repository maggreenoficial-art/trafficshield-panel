import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PanelShell } from "@/components/PanelShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "norat",
    template: "%s | norat",
  },
  description:
    "norat — proteção anti-ratos: bloqueie clonadores, bots e revisores nas suas campanhas.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/norat-logo.png",
    apple: "/norat-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-white">
        <PanelShell>{children}</PanelShell>
      </body>
    </html>
  );
}
