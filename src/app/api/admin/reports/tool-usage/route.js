import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ferramentas e suas fontes. ownerCol = coluna que identifica quem usou.
// Mapa definido com o cliente: Notificação Extrajudicial soma as duas origens;
// Blindagem NÃO inclui notificações (evita contagem dupla).
const TOOLS = [
  {
    key: "monitoramento_oab",
    label: "Monitoramento de OAB",
    sources: [{ table: "lawyer_oab_processes", ownerCol: "lawyer_id" }],
  },
  {
    key: "assinatura_digital",
    label: "Assinatura Digital",
    sources: [{ table: "assinaturas_digitais", ownerCol: "lawyer_id" }],
  },
  {
    key: "processos_datajud",
    label: "Processos datajud",
    sources: [{ table: "lawyer_processes", ownerCol: "lawyer_id" }],
  },
  {
    key: "notificacao_extrajudicial",
    label: "Notificação Extrajudicial",
    sources: [
      { table: "signature_extrajudicial_notifications", ownerCol: "created_by" },
      { table: "blindagem_notificacoes", ownerCol: "lawyer_id" },
    ],
  },
  {
    key: "blindagem_documentos",
    label: "Blindagem de documentos",
    sources: [
      { table: "blindagem_contratos", ownerCol: "lawyer_id" },
      { table: "blindagem_procuracoes", ownerCol: "lawyer_id" },
      { table: "blindagem_provas", ownerCol: "lawyer_id" },
    ],
  },
];

const PAGE_SIZE = 1000;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function parseDateParam(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Conta linhas agrupadas por dono, paginando para não estourar o limite de 1000.
async function countByOwner(db, source, fromIso, toIso) {
  const counts = new Map();
  let offset = 0;

  for (;;) {
    let query = db
      .from(source.table)
      .select(`${source.ownerCol}, created_at`)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);

    const { data, error } = await query;
    if (error) {
      const err = new Error(`Falha ao consultar ${source.table}.`);
      err.status = 500;
      throw err;
    }

    for (const row of data || []) {
      const ownerId = row[source.ownerCol];
      if (!ownerId) continue;
      counts.set(ownerId, (counts.get(ownerId) || 0) + 1);
    }

    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return counts;
}

async function resolveOwnerNames(db, ownerIds) {
  const namesById = new Map();
  const ids = [...ownerIds];
  if (!ids.length) return namesById;

  const CHUNK = 300;

  // 1) advogados (cobre lawyer_id e created_by que sejam advogados)
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await db
      .from("advogados")
      .select("id, name, email")
      .in("id", chunk);
    if (error) {
      const err = new Error("Falha ao carregar advogados.");
      err.status = 500;
      throw err;
    }
    for (const a of data || []) {
      namesById.set(a.id, { name: a.name || "Advogado", email: a.email || "—" });
    }
  }

  // 2) signature_accounts para ids ainda sem nome (app de Assinatura)
  const missing = ids.filter((id) => !namesById.has(id));
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    const { data, error } = await db
      .from("signature_accounts")
      .select("user_id, full_name, email")
      .in("user_id", chunk);
    if (error) continue; // tabela é secundária; não falha o relatório
    for (const acc of data || []) {
      namesById.set(acc.user_id, {
        name: acc.full_name || "Conta de Assinatura",
        email: acc.email || "—",
      });
    }
  }

  return namesById;
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    const db = auth.db;
    const { searchParams } = new URL(request.url);

    const fromDate = parseDateParam(searchParams.get("from"));
    const fromIso = fromDate ? fromDate.toISOString() : null;

    let toIso = null;
    const toDate = parseDateParam(searchParams.get("to"));
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      toIso = toDate.toISOString();
    }

    const aggregated = [];
    const ownerIds = new Set();

    for (const tool of TOOLS) {
      const merged = new Map();
      for (const source of tool.sources) {
        const counts = await countByOwner(db, source, fromIso, toIso);
        for (const [id, n] of counts) {
          merged.set(id, (merged.get(id) || 0) + n);
          ownerIds.add(id);
        }
      }
      aggregated.push({ tool, merged });
    }

    const namesById = await resolveOwnerNames(db, ownerIds);

    const tools = aggregated.map(({ tool, merged }) => {
      const byUser = [...merged.entries()]
        .map(([id, count]) => {
          const info = namesById.get(id);
          return {
            ownerId: id,
            name: info?.name || "Usuário removido",
            email: info?.email || "—",
            count,
          };
        })
        .sort((a, b) => b.count - a.count);

      const total = byUser.reduce((sum, row) => sum + row.count, 0);
      return { key: tool.key, label: tool.label, total, byUser };
    });

    const grandTotal = tools.reduce((sum, tool) => sum + tool.total, 0);

    return json({
      success: true,
      generatedAt: new Date().toISOString(),
      range: { from: fromIso, to: toIso },
      grandTotal,
      tools,
    });
  } catch (error) {
    console.error("[Admin/Reports/ToolUsage] Erro:", error);
    const status = Number(error?.status) || 500;
    const safe = [400, 401, 403, 503].includes(status)
      ? error?.message
      : "Não foi possível gerar as métricas de uso.";
    return json({ success: false, message: safe }, status);
  }
}
