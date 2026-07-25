"use client";

import { useState } from "react";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCardPadded, panelPillBtn, panelSectionTitle, panelBody, panelBodySmall } from "@/lib/panel-styles";
import { supportSections } from "@/lib/support-content";
import { cn } from "@/lib/utils";

function SupportSectionCard({
  id,
  title,
  intro,
  blocks,
  defaultOpen,
}: (typeof supportSections)[number] & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <section id={id} className={panelCardPadded}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-base font-medium text-white/85 sm:text-lg">{title}</h2>
          {intro && !open && (
            <p className={`mt-1 line-clamp-2 ${panelBodySmall}`}>{intro}</p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "mt-0.5 shrink-0 text-white/35 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
          {intro && <p className={panelBody}>{intro}</p>}
          {blocks.map((block, i) => (
            <div key={i}>
              {block.heading && (
                <h3 className="text-sm font-medium text-white/75 sm:text-base">
                  {block.heading}
                </h3>
              )}
              <p className={cn(panelBody, block.heading && "mt-1.5")}>{block.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SupportPageView() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Suporte"
        subtitle="Tudo explicado de um jeito simples — como se a gente estivesse conversando"
      />

      <div className={panelCardPadded}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <LifeBuoy size={18} className="text-accent" />
          </div>
          <div>
            <p className={panelSectionTitle}>Guia do cliente</p>
            <p className={`mt-2 ${panelBody}`}>
              Não precisa ser técnico para usar o norat. Aqui você entende o que cada
              coisa faz na hora de configurar domínio, campanha e link do anúncio.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className={panelSectionTitle}>Ir direto ao assunto</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {supportSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              className={panelPillBtn}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {supportSections.map((section, index) => (
          <SupportSectionCard
            key={section.id}
            {...section}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
