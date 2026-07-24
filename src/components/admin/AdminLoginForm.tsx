"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { NoratLogo } from "@/components/NoratLogo";

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
    <div className="flex min-h-screen items-center justify-center px-4 py-8" style={{ paddingTop: "max(2rem, env(safe-area-inset-top, 0px))" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-white/10 p-8"
      >
        <div className="flex items-center gap-3">
          <NoratLogo size={40} showWordmark wordmarkClassName="text-2xl" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Contra ratos — clonadores, bots e revisores
        </p>

        <label className="mt-8 block text-[10px] tracking-widest text-muted uppercase">
          E-mail admin
        </label>
        <div className="relative mt-2">
          <Mail size={14} className="absolute left-0 top-3.5 text-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-b border-white/20 bg-transparent py-3 pl-6 text-sm outline-none focus:border-accent"
            autoFocus
            required
          />
        </div>

        <label className="mt-6 block text-[10px] tracking-widest text-muted uppercase">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full border-b border-white/20 bg-transparent py-3 text-sm outline-none focus:border-accent"
          required
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black hover:bg-accent disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : "Entrar"}
        </button>
      </form>
    </div>
  );
}
