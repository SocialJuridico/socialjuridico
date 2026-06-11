import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function normalizeRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 0 && rating <= 5
    ? rating
    : null;
}

function normalizeComment(value) {
  const comment = String(value || "").trim();
  if (!comment) return null;
  return comment.slice(0, 3000);
}

async function requireDatabase() {
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço de avaliações indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, db: supabaseAdmin };
}

async function lawyerParticipatedInCase(db, caseId, lawyerId, assignedLawyerId) {
  if (assignedLawyerId === lawyerId) return true;

  const { data, error } = await db
    .from("case_interests")
    .select("id")
    .eq("case_id", caseId)
    .eq("lawyer_id", lawyerId)
    .in("status", ["NEGOTIATING", "HIRED", "DECLINED"])
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao validar participação do advogado: ${error.message}`);
  }

  return Boolean(data);
}

async function updateLawyerRatingAggregates(db, lawyerId) {
  const { data: ratings, error: ratingsError } = await db
    .from("avaliacoes_advogado")
    .select("nota")
    .eq("advogado_id", lawyerId);

  if (ratingsError) {
    throw new Error(`Falha ao recalcular avaliações: ${ratingsError.message}`);
  }

  const total = ratings?.length || 0;
  const average = total
    ? Number(
        (
          ratings.reduce(
            (sum, current) => sum + Number(current.nota || 0),
            0,
          ) / total
        ).toFixed(2),
      )
    : 0;

  const { error: updateError } = await db
    .from("advogados")
    .update({ avg_rating: average, total_ratings: total })
    .eq("id", lawyerId);

  if (updateError) {
    throw new Error(`Falha ao atualizar média do advogado: ${updateError.message}`);
  }
}

// Cliente avalia um advogado que participou do caso.
export async function POST(request) {
  try {
    const database = await requireDatabase();
    if (!database.ok) return database.response;

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const body = await request.json().catch(() => null);
    const lawyerId = body?.advogado_id;
    const caseId = body?.caso_id;
    const rating = normalizeRating(body?.nota);
    const comment = normalizeComment(body?.justificativa);

    if (!isValidUuid(lawyerId) || !isValidUuid(caseId) || rating === null) {
      return json(
        {
          success: false,
          message: "Advogado, caso ou nota inválidos.",
        },
        400,
      );
    }

    const { db } = database;
    const { data: legalCase, error: caseError } = await db
      .from("casos")
      .select("id, cliente_id, advogado_id, status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      throw new Error(`Falha ao consultar o caso: ${caseError.message}`);
    }

    if (!legalCase) {
      return json({ success: false, message: "Caso não encontrado." }, 404);
    }

    if (legalCase.cliente_id !== user.id) {
      return json(
        {
          success: false,
          message: "Você não tem permissão para avaliar este caso.",
        },
        403,
      );
    }

    const participated = await lawyerParticipatedInCase(
      db,
      caseId,
      lawyerId,
      legalCase.advogado_id,
    );

    if (!participated) {
      return json(
        {
          success: false,
          message: "Este advogado não participou da negociação deste caso.",
        },
        400,
      );
    }

    const { data: existing, error: existingError } = await db
      .from("avaliacoes_advogado")
      .select("id")
      .eq("cliente_id", user.id)
      .eq("advogado_id", lawyerId)
      .eq("caso_id", caseId)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Falha ao verificar avaliação existente: ${existingError.message}`,
      );
    }

    if (existing) {
      return json(
        {
          success: false,
          message: "Você já avaliou este advogado para este caso.",
        },
        409,
      );
    }

    const { data: review, error: insertError } = await db
      .from("avaliacoes_advogado")
      .insert([
        {
          cliente_id: user.id,
          advogado_id: lawyerId,
          caso_id: caseId,
          nota: rating,
          justificativa: comment,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return json(
          {
            success: false,
            message: "Você já avaliou este advogado para este caso.",
          },
          409,
        );
      }

      throw new Error(`Falha ao registrar avaliação: ${insertError.message}`);
    }

    try {
      await updateLawyerRatingAggregates(db, lawyerId);
    } catch (aggregateError) {
      console.error(
        "[Avaliações] Avaliação salva, mas os agregados não foram atualizados:",
        aggregateError,
      );
    }

    return json(
      {
        success: true,
        message: "Avaliação registrada com sucesso.",
        id: review.id,
      },
      201,
    );
  } catch (error) {
    console.error("[Avaliações][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível registrar a avaliação.",
      },
      500,
    );
  }
}

// Administradores listam as avaliações com os dados relacionados.
export async function GET(request) {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    const database = await requireDatabase();
    if (!database.ok) return database.response;

    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("advogado_id");

    if (lawyerId && !isValidUuid(lawyerId)) {
      return json(
        { success: false, message: "ID do advogado inválido." },
        400,
      );
    }

    let query = database.db
      .from("avaliacoes_advogado")
      .select(
        "id, nota, justificativa, created_at, cliente_id, advogado_id, caso_id",
      )
      .order("created_at", { ascending: false });

    if (lawyerId) query = query.eq("advogado_id", lawyerId);

    const { data: reviews, error: reviewsError } = await query;

    if (reviewsError) {
      throw new Error(`Falha ao consultar avaliações: ${reviewsError.message}`);
    }

    const items = reviews || [];
    const lawyerIds = [...new Set(items.map((item) => item.advogado_id).filter(Boolean))];
    const clientIds = [...new Set(items.map((item) => item.cliente_id).filter(Boolean))];
    const caseIds = [...new Set(items.map((item) => item.caso_id).filter(Boolean))];

    const [lawyersResult, clientsResult, casesResult] = await Promise.all([
      lawyerIds.length
        ? database.db.from("advogados").select("id, name").in("id", lawyerIds)
        : Promise.resolve({ data: [], error: null }),
      clientIds.length
        ? database.db.from("clientes").select("id, name").in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      caseIds.length
        ? database.db.from("casos").select("id, titulo").in("id", caseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (lawyersResult.error) {
      throw new Error(
        `Falha ao consultar advogados: ${lawyersResult.error.message}`,
      );
    }
    if (clientsResult.error) {
      throw new Error(
        `Falha ao consultar clientes: ${clientsResult.error.message}`,
      );
    }
    if (casesResult.error) {
      throw new Error(`Falha ao consultar casos: ${casesResult.error.message}`);
    }

    const lawyerMap = new Map(
      (lawyersResult.data || []).map((lawyer) => [lawyer.id, lawyer.name]),
    );
    const clientMap = new Map(
      (clientsResult.data || []).map((client) => [client.id, client.name]),
    );
    const caseMap = new Map(
      (casesResult.data || []).map((legalCase) => [legalCase.id, legalCase.titulo]),
    );

    const enriched = items.map((review) => ({
      ...review,
      advogado_nome: lawyerMap.get(review.advogado_id) || "Advogado removido",
      cliente_nome: clientMap.get(review.cliente_id) || "Cliente removido",
      caso_titulo: caseMap.get(review.caso_id) || "Caso removido",
    }));

    return json({ success: true, data: enriched });
  } catch (error) {
    console.error("[Avaliações][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar as avaliações.",
      },
      500,
    );
  }
}
