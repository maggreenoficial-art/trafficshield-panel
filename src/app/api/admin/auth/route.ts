import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/db/profiles";
import { hasAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonWithCookies(
  body: Record<string, unknown>,
  status: number,
  cookieSource: NextResponse
) {
  const response = NextResponse.json(body, { status });
  cookieSource.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}

export async function POST(request: NextRequest) {
  const cookieCarrier = NextResponse.next({ request });

  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient(request, cookieCarrier);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        return NextResponse.json(
          {
            error:
              "E-mail ainda não confirmado. Abra o link no e-mail ou confirme manualmente no Supabase → Authentication.",
          },
          { status: 401 }
        );
      }

      if (error?.message?.toLowerCase().includes("invalid login credentials")) {
        return NextResponse.json(
          {
            error:
              "E-mail ou senha incorretos. Se o perfil admin existe só na tabela profiles, crie ou redefina o usuário em Supabase → Authentication → Users.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error?.message ?? "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const profile = hasAdminClient()
      ? await getProfileById(data.user.id)
      : await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single<{ role: string }>()
          .then(({ data: row }) =>
            row ? { id: data.user.id, role: row.role } : null
          );

    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Conta sem perfil. Rode supabase/reset-admin-password.sql no Supabase para criar o perfil admin.",
        },
        { status: 403 }
      );
    }

    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: `Acesso restrito a administradores. Seu perfil está como "${profile.role}". Rode o SQL de admin no Supabase.`,
        },
        { status: 403 }
      );
    }

    return jsonWithCookies({ success: true }, 200, cookieCarrier);
  } catch {
    return NextResponse.json({ error: "Erro ao autenticar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieCarrier = NextResponse.next({ request });
  const supabase = createRouteHandlerClient(request, cookieCarrier);
  await supabase.auth.signOut();
  return jsonWithCookies({ success: true }, 200, cookieCarrier);
}
