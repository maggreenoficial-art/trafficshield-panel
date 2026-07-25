import type { Metadata } from "next";
import { TrafficOverviewView } from "@/components/admin/TrafficOverviewView";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default function PainelPage() {
  return <TrafficOverviewView />;
}
