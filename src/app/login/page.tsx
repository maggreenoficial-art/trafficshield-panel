import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
