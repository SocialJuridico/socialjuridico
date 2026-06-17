import {
  clientJson,
  requireClientUser,
  safeClientError,
} from "@/lib/clientDashboard/clientServer";
import { formatStoredOAB } from "@/lib/oab";
import { isPremiumPlanCurrentlyActive } from "@/lib/planUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function loadClientProfile(db, user) {
  let result = await db
    .from("clientes")
    .select("id, name, email, role, phone, avatar, bio, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Falha ao consultar perfil: ${result.error.message}`);
  }

  if (!result.data && user.email) {
    result = await db
      .from("clientes")
      .select("id, name, email, role, phone, avatar, bio, created_at")
      .eq("email", user.email)
      .maybeSingle();

    if (result.error) {
      throw new Error(`Falha ao consultar perfil: ${result.error.message}`);
    }
  }

  if (result.data) {
    return {
      ...result.data,
      onboarding_complete: user.user_metadata?.onboarding_complete === true,
    };
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Cliente",
    role: "CLIENT",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("clientes")
    .insert([payload])
    .select("id, name, email, role, phone, avatar, bio, created_at")
    .single();

  if (error) {
    throw new Error(`Falha ao criar perfil do cliente: ${error.message}`);
  }

  return {
    ...data,
    onboarding_complete: user.user_metadata?.onboarding_complete === true,
  };
}

async function loadCases(db, profileId, authId) {
  let result = await db
    .from("casos")
    .select(
      "id, titulo, descricao, area_atuacao, cidade, estado, status, advogado_id, anexos, video_link, video_url, audio_url, chat_started, negotiating_lawyers, created_at, updated_at",
    )
    .eq("cliente_id", authId)
    .neq("status", "CANCELADO")
    .order("created_at", { ascending: false })
    .limit(200);

  if (result.error) {
    throw new Error(`Falha ao carregar casos: ${result.error.message}`);
  }

  if (!result.data?.length && profileId && profileId !== authId) {
    result = await db
      .from("casos")
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, advogado_id, anexos, video_link, video_url, audio_url, chat_started, negotiating_lawyers, created_at, updated_at",
      )
      .eq("cliente_id", profileId)
      .neq("status", "CANCELADO")
      .order("created_at", { ascending: false })
      .limit(200);

    if (result.error) {
      throw new Error(`Falha ao carregar casos: ${result.error.message}`);
    }
  }

  return result.data || [];
}

async function loadInterests(db, cases) {
  const activeCases = cases.filter((item) =>
    ["ABERTO", "NEGOCIANDO"].includes(item.status),
  );
  if (!activeCases.length) return [];

  const caseIds = activeCases.map((item) => item.id);
  const { data: interests, error } = await db
    .from("case_interests")
    .select("id, case_id, lawyer_id, status, created_at")
    .in("case_id", caseIds)
    .in("status", ["PENDING", "NEGOTIATING"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar interesses: ${error.message}`);
  }

  const lawyerIds = [
    ...new Set((interests || []).map((item) => item.lawyer_id).filter(Boolean)),
  ];
  let lawyersById = {};

  if (lawyerIds.length) {
    const { data: lawyers, error: lawyerError } = await db
      .from("advogados")
      .select("id, name, avatar, oab, estado, is_premium, premium_expires_at, plan_type")
      .in("id", lawyerIds);

    if (lawyerError) {
      throw new Error(
        `Falha ao carregar advogados interessados: ${lawyerError.message}`,
      );
    }

    lawyersById = Object.fromEntries(
      (lawyers || []).map((lawyer) => [lawyer.id, lawyer]),
    );
  }

  const casesById = Object.fromEntries(
    activeCases.map((item) => [item.id, item]),
  );

  return (interests || []).map((item) => ({
    ...item,
    lawyer_name: lawyersById[item.lawyer_id]?.name || "Advogado",
    lawyer_avatar: lawyersById[item.lawyer_id]?.avatar || null,
    lawyer_oab: formatStoredOAB(
      lawyersById[item.lawyer_id]?.oab,
      lawyersById[item.lawyer_id]?.estado,
    ),
    lawyer_is_premium: isPremiumPlanCurrentlyActive(lawyersById[item.lawyer_id]),
    caso_titulo: casesById[item.case_id]?.titulo || "Caso",
    caso_area: casesById[item.case_id]?.area_atuacao || "",
    caso_status: casesById[item.case_id]?.status || "ABERTO",
  }));
}

async function loadLawyers(db) {
  const { data, error } = await db
    .from("advogados")
    .select(
      "id, name, avatar, bio, oab, estado, avg_rating, total_ratings, specialties, is_premium, premium_expires_at, plan_type, consulta, tempo, valor, oab_verification_status, escritorio_id, cargo",
    )
    .neq("oab_verification_status", "ERROR")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(`Falha ao carregar advogados: ${error.message}`);
  }

  const visibleLawyers = (data || []).filter(
    (lawyer) =>
      !["secretaria", "estagiario"].includes(
        String(lawyer.cargo || "").toLowerCase(),
      ) && String(lawyer.specialties || "").trim(),
  );

  const officeIds = [
    ...new Set(visibleLawyers.map((item) => item.escritorio_id).filter(Boolean)),
  ];
  let officesById = {};

  if (officeIds.length) {
    const { data: offices, error: officeError } = await db
      .from("escritorios")
      .select("id, nome, logo_url")
      .in("id", officeIds);

    if (officeError) {
      throw new Error(`Falha ao carregar escritórios: ${officeError.message}`);
    }

    officesById = Object.fromEntries(
      (offices || []).map((office) => [office.id, office]),
    );
  }

  return visibleLawyers
    .map((lawyer) => ({
      ...lawyer,
      is_premium: isPremiumPlanCurrentlyActive(lawyer),
      oab: formatStoredOAB(lawyer.oab, lawyer.estado),
      nome_escritorio: officesById[lawyer.escritorio_id]?.nome || null,
      logo_escritorio: officesById[lawyer.escritorio_id]?.logo_url || null,
    }))
    .sort((a, b) => {
      if (a.is_premium !== b.is_premium) {
        return Number(b.is_premium) - Number(a.is_premium);
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });
}

async function loadNotifications(db, userId) {
  const { data, error } = await db
    .from("notificacoes")
    .select("id, titulo, mensagem, tipo, link, lida, meta, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Falha ao carregar notificações: ${error.message}`);
  }

  return (data || [])
    .map((item) => ({ ...item, meta: parseMeta(item.meta) }))
    .filter((item) => !item.meta.deleted_by_user);
}

export async function GET(request) {
  try {
    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const profile = await loadClientProfile(access.db, access.user);
    const [cases, lawyers, notifications] = await Promise.all([
      loadCases(access.db, profile.id, access.user.id),
      loadLawyers(access.db),
      loadNotifications(access.db, access.user.id),
    ]);
    const interests = await loadInterests(access.db, cases);

    const summary = {
      totalCases: cases.length,
      activeCases: cases.filter((item) =>
        ["ABERTO", "NEGOCIANDO", "CONTRATADO", "EM_ANDAMENTO"].includes(
          item.status,
        ),
      ).length,
      conversations: cases.filter((item) => Boolean(item.advogado_id)).length,
      interests: interests.length,
      unreadNotifications: notifications.filter((item) => !item.lida).length,
      lawyers: lawyers.length,
    };

    return clientJson({
      success: true,
      data: {
        profile,
        cases,
        lawyers,
        interests,
        notifications,
        summary,
      },
    });
  } catch (error) {
    return safeClientError(
      error,
      "Não foi possível carregar o painel do cliente.",
    );
  }
}
