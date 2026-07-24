import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Loader2 } from "lucide-react";

function LoginFallback() {
  return (
    <div className="login-shell flex min-h-screen items-center justify-center bg-[#030508]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-accent" size={32} />
        <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
          Carregando norat...
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
