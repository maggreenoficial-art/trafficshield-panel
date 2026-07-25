"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Eye,
  Globe,
  Link2,
  Radar,
  Shield,
  Zap,
} from "lucide-react";
import { NoratLogo } from "@/components/NoratLogo";
import { NoratText } from "@/components/marketing/NoratText";
import { HeroGridScan } from "@/components/marketing/HeroGridScan";
import { PlatformsShowcaseCard } from "@/components/marketing/PlatformsShowcaseCard";
import { TrustBenefitsCards } from "@/components/marketing/TrustBenefitsCards";
import {
  DecryptedText,
  TrueFocus,
} from "@/components/react-bits";

const mCard =
  "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 sm:p-5";
const mTitle = "text-sm font-medium text-white/75";
const mDesc = "mt-1.5 text-xs leading-relaxed text-white/40";
const mPillBtn =
  "rounded-full px-4 py-2 text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white";

const navLinks = [
  { href: "#beneficios", label: "Benefícios" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

const benefits = [
  {
    title: "Escale sem perder a campanha",
    desc: "Troque a página de oferta em tempo real sem reenviar o anúncio para revisão. A URL do anúncio não muda.",
  },
  {
    title: "Funil protegido contra espionagem",
    desc: "Clonadores e ferramentas de spy veem só a página segura. Sua oferta real fica isolada em outro domínio.",
  },
  {
    title: "Tráfego real, métricas reais",
    desc: "Bots e acessos inválidos são filtrados antes do funil. Você decide com base em cliques qualificados.",
  },
  {
    title: "Mais agressividade, menos bloqueio",
    desc: "Página segura congruente com o anúncio para revisores. Oferta real só para quem passou no filtro.",
  },
];

const threats = [
  {
    icon: Eye,
    color: "orange",
    title: "Clonadores",
    desc: "Concorrentes e espiões que copiam sua estrutura de funil e oferta.",
  },
  {
    icon: Bot,
    color: "red",
    title: "Bots",
    desc: "Tráfego automatizado que consome verba e distorce suas métricas.",
  },
  {
    icon: Radar,
    color: "indigo",
    title: "Revisores",
    desc: "Ferramentas das plataformas de anúncio analisando sua página real.",
  },
];

const steps = [
  {
    step: "01",
    title: "Conecte seu domínio",
    desc: "Cadastre um subdomínio dedicado (ex: ads.seudominio.com) com CNAME validado. Seu site principal não muda.",
  },
  {
    step: "02",
    title: "Configure a campanha",
    desc: "Defina página segura, página de oferta, filtros de país, dispositivo e fonte de tráfego — tudo no painel.",
  },
  {
    step: "03",
    title: "Cole o link no anúncio",
    desc: "O norat filtra cada clique em tempo real e envia visitantes qualificados para a oferta. O resto vê conteúdo seguro.",
  },
];

const features = [
  {
    icon: Shield,
    color: "orange",
    title: "Cloaker com scoring inteligente",
    desc: "Analisa UA, geo, dispositivo, token e sinais de automação para separar visitante real de bot ou revisor.",
  },
  {
    icon: Globe,
    color: "blue",
    title: "Domínio exclusivo de campanha",
    desc: "Use ads.seudominio.com no anúncio. Seu checkout e site principal ficam em outro endereço, isolados.",
  },
  {
    icon: Link2,
    color: "purple",
    title: "Token único por campanha",
    desc: "Parâmetro vp_t exclusivo que impede spy tools de replicar seu link e acessar a oferta diretamente.",
  },
  {
    icon: Zap,
    color: "green",
    title: "Redirect, mirror e pre-page",
    desc: "Escolha como entregar safe e oferta — incluindo mirror para esconder o domínio real da oferta.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 197",
    period: "/mês",
    desc: "Para validar suas primeiras campanhas com proteção profissional.",
    clicks: "20.000 cliques",
    domains: "3 domínios",
    overage: "R$ 0,05/clique extra",
    sources: "Meta, Google e TikTok",
    highlights: [
      "Campanhas ilimitadas",
      "Painel completo",
      "Token único",
      "Suporte por e-mail",
    ],
    featured: false,
    badge: null as string | null,
  },
  {
    name: "Pro",
    price: "R$ 597",
    period: "/mês",
    desc: "Para media buyers que rodam volume todos os dias.",
    clicks: "100.000 cliques",
    domains: "10 domínios",
    overage: "R$ 0,02/clique extra",
    sources: "Todas as fontes do painel",
    highlights: [
      "Tudo do Starter",
      "Analytics avançado",
      "Suporte prioritário",
      "Múltiplos workspaces",
    ],
    featured: true,
    badge: "Mais popular",
  },
  {
    name: "Scale",
    price: "R$ 997",
    period: "/mês",
    desc: "Para operações de alto volume e agências.",
    clicks: "300.000 cliques",
    domains: "20 domínios",
    overage: "R$ 0,01/clique extra",
    sources: "Todas as fontes + API (em breve)",
    highlights: [
      "Tudo do Pro",
      "Onboarding dedicado",
      "Limites sob demanda",
      "SLA personalizado",
    ],
    featured: false,
    badge: "Melhor custo/clique",
  },
];

const faqs = [
  {
    q: "Preciso trocar a URL do anúncio quando mudo a oferta?",
    a: "Não. Você altera a página de oferta no painel norat e o link do anúncio continua o mesmo — sem nova revisão na plataforma.",
  },
  {
    q: "O norat substitui minha loja ou checkout?",
    a: "Não. Só o subdomínio da campanha (ex: ads.seudominio.com) aponta para o norat. Seu site, checkout e domínio principal continuam onde estão.",
  },
  {
    q: "Posso usar o mesmo domínio da minha oferta?",
    a: "Não recomendamos. O domínio do anúncio fica exposto nas configurações e pode ser visto por concorrentes. Use um subdomínio exclusivo para campanha.",
  },
  {
    q: "Funciona com Meta, Google e TikTok?",
    a: "Sim. Você escolhe a fonte na campanha e o sistema gera os parâmetros corretos (fbclid, gclid, utm_source, etc.).",
  },
  {
    q: "O que é página segura vs página de oferta?",
    a: "A página segura é neutra e dentro das políticas — para bots e revisores. A oferta é a página real de venda, exibida só para tráfego qualificado.",
  },
  {
    q: "Quanto tempo leva para colocar no ar?",
    a: "Com o CNAME configurado, a maioria dos usuários cria a primeira campanha em menos de 15 minutos seguindo o wizard do painel.",
  },
];

export function NoratLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="landing-header fixed inset-x-0 top-0 z-50">
        <div className="relative mx-auto max-w-6xl px-3 py-2 sm:px-6 lg:py-0">
          <div className="flex flex-wrap items-center justify-between gap-y-2 lg:h-16 lg:flex-nowrap">
            <Link
              href="/"
              className="relative z-10 flex shrink-0 items-center py-1"
            >
              <NoratLogo priority size="sm" />
            </Link>

            <nav
              className="order-3 w-full lg:absolute lg:left-1/2 lg:order-none lg:w-auto lg:-translate-x-1/2"
              aria-label="Navegação principal"
            >
              <div className="landing-nav-pill mx-auto flex w-fit max-w-full items-center gap-0 overflow-x-auto rounded-full p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-0.5 sm:p-1 [&::-webkit-scrollbar]:hidden">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-4 sm:py-2 sm:text-[13px]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </nav>

            <div className="relative z-10 flex shrink-0 items-center">
              <div className="landing-nav-pill flex items-center gap-0.5 rounded-full p-0.5 sm:p-1">
                <Link
                  href="/login"
                  className="rounded-full px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-4 sm:py-2 sm:text-[13px]"
                >
                  Já sou cliente
                </Link>
                <Link
                  href="#planos"
                  className="rounded-full px-2.5 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-4 sm:py-2 sm:text-[13px]"
                >
                  Assinar agora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-[7.5rem] lg:pt-16">
        <section className="relative min-h-[36rem] isolate overflow-hidden border-b border-white/10 sm:min-h-[40rem] lg:min-h-[44rem]">
          <div className="absolute inset-0 z-0">
            <HeroGridScan />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/90 via-black/82 to-black/92"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <p className="landing-nav-pill mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <DecryptedText
                text="Acesso exclusivo · Vagas limitadas"
                animateOn="view"
                sequential
                speed={35}
                className="text-white/55"
                encryptedClassName="text-white/20"
                parentClassName="text-[10px] tracking-[0.2em] uppercase"
              />
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Mais controle no tráfego.
            </h1>
            <div className="mt-4 overflow-hidden">
              <TrueFocus
                sentence="Mais segurança para escalar"
                borderColor="#fbbf24"
                glowColor="rgba(251, 191, 36, 0.45)"
                blurAmount={4}
                animationDuration={0.45}
                pauseBetweenAnimations={1.2}
                wordClassName="text-2xl font-semibold tracking-tight text-accent sm:text-4xl lg:text-5xl"
                containerClassName="flex-wrap gap-x-2 gap-y-1 sm:gap-x-3"
              />
            </div>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Filtre bots, revisores, clonadores e ferramentas de espionagem antes
              que impactem suas campanhas. Só o visitante qualificado chega na sua
              oferta — o resto vê a página segura.
            </p>
            <div className="mt-10">
              <div className="landing-nav-pill inline-flex items-center gap-0.5 rounded-full p-1">
                <Link
                  href="#planos"
                  className="rounded-full px-4 py-2 text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-5 sm:py-2.5"
                >
                  Assinar agora
                </Link>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white sm:px-5 sm:py-2.5"
                >
                  Já sou cliente
                </Link>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/50">
              Planos mensais · Campanhas ilimitadas · Primeira campanha em ~15 min
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
            <PlatformsShowcaseCard />
            <TrustBenefitsCards />
          </div>
        </section>

        <section
          id="beneficios"
          className="border-b border-white/10 bg-white/[0.02] py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
                  <NoratText highlightClassName="text-accent">
                    Por que norat
                  </NoratText>
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Proteja seu orçamento e opere com dados reais
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
                  <NoratText>
                    Filtre o ruído antes do funil. Com o norat, cada decisão de
                    escala é baseada em cliques qualificados — não em bots, revisores
                    ou curiosos drenando sua verba.
                  </NoratText>
                </p>
              </div>

              <div className="relative mx-auto aspect-square w-full max-w-sm lg:max-w-none">
                <Image
                  src="/markerato.png"
                  alt="norat — proteção de orçamento e dados reais de campanha"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div key={item.title} className={mCard}>
                  <h3 className={mTitle}>{item.title}</h3>
                  <p className={mDesc}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="problema"
          className="border-b border-white/10 bg-white/[0.02] py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
                  Ameaças que drenam sua verba
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Cada clique inválido custa dinheiro e expõe sua operação
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
                  Quem roda tráfego pago sabe: não é só volume. É quem está vendo
                  sua página, copiando seu funil e drenando sua verba com tráfego
                  que nunca vai comprar.
                </p>
                <div className="mt-6">
                  <TrueFocus
                    sentence="Clonadores Bots Revisores"
                    borderColor="#fbbf24"
                    glowColor="rgba(251, 191, 36, 0.35)"
                    blurAmount={3}
                    animationDuration={0.4}
                    pauseBetweenAnimations={0.9}
                    wordClassName="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-sm"
                    containerClassName="gap-x-4"
                  />
                </div>
              </div>

              <div className="relative mx-auto aspect-square w-full max-w-sm lg:max-w-none">
                <Image
                  src="/antirat.png"
                  alt="norat bloqueando acesso de espiões — acesso negado"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {threats.map(({ icon: Icon, title, desc }) => (
                <div key={title} className={mCard}>
                  <Icon
                    className="mb-3 h-4 w-4 text-white/30"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <h3 className={mTitle}>{title}</h3>
                  <p className={mDesc}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
              Como funciona
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Três passos para blindar sua campanha
            </h2>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="relative">
                  <p className="font-mono text-2xl font-medium text-white/[0.08]">
                    {item.step}
                  </p>
                  <h3 className="mt-2 text-sm font-medium text-white/75">
                    {item.title}
                  </h3>
                  <p className={mDesc}>
                    <NoratText>{item.desc}</NoratText>
                  </p>
                </div>
              ))}
            </div>
            <div className={`mt-12 ${mCard}`}>
              <p className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                Fluxo em tempo real
              </p>
              <div className="mt-4 flex flex-col gap-3 font-mono text-xs text-white/45 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <span>Anúncio</span>
                <ArrowRight size={14} className="hidden text-white/25 sm:block" />
                <span className="text-white/60">
                  <DecryptedText
                    text="ads.seudominio.com/c/slug"
                    animateOn="hover"
                    sequential
                    speed={30}
                    className="text-white/60"
                    encryptedClassName="text-white/25"
                    parentClassName="font-mono"
                  />
                </span>
                <ArrowRight size={14} className="hidden text-white/25 sm:block" />
                <span className="text-white/55">
                  <NoratText>norat filtra</NoratText>
                </span>
                <ArrowRight size={14} className="hidden text-white/25 sm:block" />
                <span className="text-white/50">Oferta</span>
                <span className="text-white/20">ou</span>
                <span className="text-white/40">Página segura</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="border-y border-white/10 bg-white/[0.02] py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
              Recursos
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Tudo que você precisa para rodar com segurança
            </h2>

            <div className="mt-12 grid gap-3 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className={`flex gap-3 ${mCard}`}>
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-white/30"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div>
                    <h3 className={mTitle}>{title}</h3>
                    <p className={mDesc}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
              Planos
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Planos por volume de cliques
            </h2>
            <p className="mt-4 max-w-lg text-sm text-white/55">
              Escolha o plano ideal para sua operação. Campanhas ilimitadas em
              todos os planos — você paga pelo volume de cliques filtrados.
            </p>
            <p className="landing-nav-pill mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/50">
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Vagas limitadas para novos workspaces — garanta o seu acesso
            </p>
            <div className="mt-12 grid gap-3 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`flex flex-col ${mCard} ${
                    plan.featured ? "border-white/12" : ""
                  }`}
                >
                  {plan.badge && (
                    <span className="mb-3 w-fit rounded-full border border-white/10 px-2 py-0.5 text-[10px] tracking-wider text-white/45 uppercase">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-base font-medium text-white/80">{plan.name}</h3>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-medium text-white/90">
                      {plan.price}
                    </span>
                    <span className="text-xs text-white/35">{plan.period}</span>
                  </p>
                  <p className="mt-2 text-xs text-white/40">{plan.desc}</p>

                  <div className="mt-4 space-y-1.5 border-y border-white/[0.06] py-4 text-xs text-white/50">
                    <p>
                      <span className="text-white/35">Cliques: </span>
                      <span className="text-white/65">{plan.clicks}</span>
                    </p>
                    <p>
                      <span className="text-white/35">Domínios: </span>
                      {plan.domains}
                    </p>
                    <p>
                      <span className="text-white/35">Excedente: </span>
                      {plan.overage}
                    </p>
                    <p>
                      <span className="text-white/35">Fontes: </span>
                      {plan.sources}
                    </p>
                  </div>

                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs text-white/50"
                      >
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-white/30"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="landing-nav-pill mt-6 rounded-full p-1">
                    <Link
                      href="/login"
                      className={`${mPillBtn} flex w-full items-center justify-center gap-1.5`}
                    >
                      Assinar {plan.name}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
              Operação profissional
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Feito para quem leva tráfego pago a sério
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
              <NoratText>
                O norat não é gratuito — e nem deveria ser. Cada clique filtrado
                passa por infraestrutura dedicada. Você paga pelo que usa e opera
                com a mesma stack usada por media buyers de alto volume.
              </NoratText>
            </p>
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <div className={mCard}>
                <p className={mTitle}>Setup guiado</p>
                <p className={mDesc}>
                  Wizard passo a passo do domínio ao link do anúncio.
                </p>
              </div>
              <div className={mCard}>
                <p className={mTitle}>Workspace isolado</p>
                <p className={mDesc}>
                  Cada conta com domínios, campanhas e dados separados.
                </p>
              </div>
              <div className={mCard}>
                <p className={mTitle}>Suporte em PT-BR</p>
                <p className={mDesc}>
                  Documentação e painel pensados para o mercado brasileiro.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-[10px] tracking-[0.2em] text-accent uppercase">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Perguntas frequentes
            </h2>
            <div className="mt-10 divide-y divide-white/[0.06] rounded-lg border border-white/[0.06]">
              {faqs.map((item, i) => (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left text-sm text-white/65 transition-colors hover:text-white/85"
                  >
                    <span className="min-w-0 flex-1 pr-1 leading-relaxed">
                      <NoratText>{item.q}</NoratText>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`mt-0.5 shrink-0 text-white/30 transition-transform ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="px-4 pb-3.5 text-xs leading-relaxed text-white/40">
                      <NoratText highlightClassName="text-accent/90">
                        {item.a}
                      </NoratText>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Proteja seu funil.
              <br />
              <span className="text-accent">Escale com os ratos de fora.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-white/55 sm:text-base">
              Escolha seu plano, ative o workspace e coloque a primeira campanha
              no ar ainda hoje. Acesso liberado após confirmação da assinatura.
            </p>
            <div className="landing-nav-pill mt-8 inline-flex rounded-full p-1">
              <Link
                href="#planos"
                className={`${mPillBtn} inline-flex items-center gap-1.5 sm:px-5 sm:py-2.5`}
              >
                Ver planos
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <NoratLogo size="sm" className="opacity-80" />
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()}{" "}
            <NoratText highlightClassName="text-white/55">
              norat — contra ratos digitais
            </NoratText>
          </p>
          <div className="flex gap-6 text-xs text-white/50">
            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link href="#planos" className="hover:text-white">
              Planos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
