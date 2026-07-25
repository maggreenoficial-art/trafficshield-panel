import type { Metadata } from "next";
import { NoratLandingPage } from "@/components/marketing/NoratLandingPage";

export const metadata: Metadata = {
  title: "norat — Proteção anti-ratos para campanhas de tráfego pago",
  description:
    "Cloaker profissional contra clonadores, bots e revisores. Domínio isolado, painel simples e link pronto para Meta, Google e TikTok.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "norat — Proteção anti-ratos para campanhas",
    description:
      "Filtre tráfego inválido antes da sua oferta. Cloaker com domínio dedicado e painel self-service.",
    type: "website",
  },
};

export default function HomePage() {
  return <NoratLandingPage />;
}
