"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { NoratLogo } from "@/components/NoratLogo";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/15";

const tabClass = (active: boolean) =>
  cn(
    "flex-1 rounded-full px-4 py-2 text-sm transition-colors",
    active
      ? "bg-white/[0.06] text-white"
      : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
  );

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: mode === "login" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { email, password, companyName }
        ),
        credentials: "same-origin",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível continuar.");
        return;
      }

      if (data.needsEmailConfirmation) {
        setSuccess(data.message ?? "Conta criada! Confirme seu e-mail.");
        setMode("login");
        return;
      }

      const from = searchParams.get("from") ?? "/painel";
      window.location.assign(from);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setSuccess("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="flex items-center py-1">
              <NoratLogo priority size="lg" />
            </Link>
          </div>

          <div className="mb-6 text-center">
            <p className="text-xs tracking-[0.2em] text-white/35 uppercase">
              {mode === "login" ? "Área do cliente" : "Novo workspace"}
            </p>
            <h1 className="mt-2 text-xl font-medium tracking-tight text-white/85 sm:text-2xl">
              {mode === "login" ? "Entrar no painel" : "Ativar sua conta"}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-white/40">
              {mode === "login"
                ? "Acesso exclusivo para assinantes."
                : "Após assinar um plano, crie seu workspace aqui."}
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
            <div className="landing-nav-pill mb-6 flex rounded-full p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={tabClass(mode === "login")}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={tabClass(mode === "register")}
              >
                Assinar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/40">
                    Empresa / projeto
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Minha Loja"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-white/40">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={inputClass}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/40">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  required
                />
              </div>

              {success && (
                <p className="text-xs text-white/55">{success}</p>
              )}

              {error && <p className="text-sm text-red-400/90">{error}</p>}

              <div className="landing-nav-pill rounded-full p-1 pt-2">
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      {mode === "login" ? "Entrar" : "Ativar workspace"}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-white/35">
            Ainda não assinou?{" "}
            <Link
              href="/#planos"
              className="text-white/55 transition-colors hover:text-white/80"
            >
              Ver planos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
