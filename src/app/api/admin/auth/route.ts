import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/db/profiles";
import { createTenantForUser, getUserMemberships } from "@/lib/db/tenants";
import { setTenantCookie } from "@/lib/api/panel-context";
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
              "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
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
      : null;

    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Conta sem perfil. Contate o suporte." },
        { status: 403 }
      );
    }

    const memberships = hasAdminClient()
      ? await getUserMemberships(data.user.id)
      : [];

    const isPlatformAdmin = profile.role === "admin";
    if (!isPlatformAdmin && memberships.length === 0) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Conta sem workspace. Crie uma conta nova ou peça um convite ao administrador.",
        },
        { status: 403 }
      );
    }

    const tenantId =
      memberships[0]?.tenantId ?? "00000000-0000-0000-0000-000000000001";

    const response = jsonWithCookies(
      {
        success: true,
        tenant: memberships[0]?.tenant ?? null,
        isPlatformAdmin,
      },
      200,
      cookieCarrier
    );
    return setTenantCookie(response, tenantId);
  } catch {
    return NextResponse.json({ error: "Erro ao autenticar." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const cookieCarrier = NextResponse.next({ request });

  try {
    const { email, password, companyName } = (await request.json()) as {
      email?: string;
      password?: string;
      companyName?: string;
    };

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "E-mail e senha (mín. 8 caracteres) são obrigatórios." },
        { status: 400 }
      );
    }

    if (!hasAdminClient()) {
      return NextResponse.json(
        { error: "Cadastro indisponível. Configure o Supabase." },
        { status: 503 }
      );
    }

    const supabase = createRouteHandlerClient(request, cookieCarrier);
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { company_name: companyName?.trim() || null },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Erro ao criar conta." },
        { status: 400 }
      );
    }

    const membership = await createTenantForUser({
      userId: data.user.id,
      email: normalizedEmail,
      name: companyName?.trim() || normalizedEmail.split("@")[0],
    });

    if (!data.session) {
      return NextResponse.json({
        success: true,
        needsEmailConfirmation: true,
        message:
          "Conta criada! Confirme seu e-mail e faça login para acessar seu painel zerado.",
        tenant: membership.tenant,
      });
    }

    const response = jsonWithCookies(
      {
        success: true,
        tenant: membership.tenant,
        isPlatformAdmin: false,
      },
      200,
      cookieCarrier
    );
    return setTenantCookie(response, membership.tenantId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao cadastrar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieCarrier = NextResponse.next({ request });
  const supabase = createRouteHandlerClient(request, cookieCarrier);
  await supabase.auth.signOut();
  const response = jsonWithCookies({ success: true }, 200, cookieCarrier);
  response.cookies.delete("norat_tenant_id");
  return response;
}
