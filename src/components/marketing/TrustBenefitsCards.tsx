"use client";

import { Cloud, Clock, KeyRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardTitle,
} from "@/components/ui/feature-card";

const trustBenefits: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: KeyRound,
    title: "Acesso exclusivo por assinatura",
    description: "Painel profissional reservado para assinantes — sem plano gratuito.",
  },
  {
    icon: Clock,
    title: "Setup em menos de 15 minutos",
    description: "CNAME validado e primeira campanha no ar seguindo o wizard do painel.",
  },
  {
    icon: Cloud,
    title: "Infraestrutura cloud — sem servidor",
    description: "Tudo roda na nuvem. Nada para instalar, manter ou escalar do seu lado.",
  },
  {
    icon: Users,
    title: "Vagas limitadas por mês",
    description: "Onboarding controlado para garantir qualidade e suporte a cada workspace.",
  },
];

export function TrustBenefitsCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {trustBenefits.map(({ icon: Icon, title, description }) => (
        <FeatureCard key={title} className="max-w-none">
          <Icon
            className="mb-3 h-4 w-4 text-white/30"
            strokeWidth={1.5}
            aria-hidden
          />
          <FeatureCardTitle>{title}</FeatureCardTitle>
          <FeatureCardDescription className="mt-1.5">{description}</FeatureCardDescription>
        </FeatureCard>
      ))}
    </div>
  );
}
