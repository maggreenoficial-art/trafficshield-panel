"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Eye,
  Loader2,
  Lock,
  Mail,
  Radar,
  Shield,
} from "lucide-react";

const shields = [
  { icon: Bot, label: "Bots", status: "blocked" },
  { icon: Eye, label: "Clonadores", status: "blocked" },
  { icon: Radar, label: "Revisores", status: "filtered" },
];

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Credenciais inválidas.");
        return;
      }

      const from = searchParams.get("from") ?? "/";
      window.location.assign(from);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell relative min-h-screen overflow-hidden bg-[#030508] text-white">
      <div className="login-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="login-glow login-glow-a pointer-events-none absolute inset-0" aria-hidden />
      <div className="login-glow login-glow-b pointer-events-none absolute inset-0" aria-hidden />
      <div className="login-scanline pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] tracking-[0.2em] text-accent uppercase">
              <span className="login-pulse h-1.5 w-1.5 rounded-full bg-accent" />
              Sistema ativo
            </div>

            <div className="mt-10 flex items-center gap-5">
              <div className="login-logo-ring relative shrink-0">
                <Image
                  src="/norat-logo.png"
                  alt="norat"
                  width={88}
                  height={88}
                  className="relative z-10 rounded-2xl object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  nor<span className="text-accent">at</span>
                </h1>
                <p className="mt-1 font-mono text-xs tracking-widest text-muted uppercase">
                  anti-rat protocol
                </p>
              </div>
            </div>

            <p className="mt-8 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
              Proteção de campanhas contra{" "}
              <span className="text-accent">ratos digitais</span> — clonadores,
              bots e revisores de anúncios.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:max-w-lg">
              {shields.map(({ icon: Icon, label, status }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-accent">
                    <Icon size={14} />
                    <span className="text-[10px] tracking-widest uppercase">
                      {label}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-green-400/90 uppercase">
                    {status}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 hidden font-mono text-[10px] tracking-widest text-white/30 lg:block">
            <p>// norat v0.1 — campaign shield</p>
            <p className="mt-1">// encrypted admin channel</p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <form
            onSubmit={handleSubmit}
            className="login-card w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-8 backdrop-blur-xl sm:p-10"
          >
            <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-muted uppercase">
              <Shield size={12} className="text-accent" />
              Acesso administrativo
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Entrar no painel
            </h2>
            <p className="mt-2 text-xs text-muted">
              Autentique-se para gerenciar campanhas e domínios protegidos.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-widest text-muted uppercase">
                  E-mail
                </label>
                <div className="login-input-wrap relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@seudominio.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pr-4 pl-11 text-sm outline-none transition-colors placeholder:text-white/25 focus:border-accent/50 focus:bg-accent/[0.03]"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] tracking-widest text-muted uppercase">
                  Senha
                </label>
                <div className="login-input-wrap relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pr-4 pl-11 text-sm outline-none transition-colors placeholder:text-white/25 focus:border-accent/50 focus:bg-accent/[0.03]"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="login-submit mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-black transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Iniciar sessão
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="mt-6 text-center font-mono text-[10px] tracking-wider text-white/25">
              TLS · sessão criptografada · norat shield
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
