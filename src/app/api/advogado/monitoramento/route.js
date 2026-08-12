import {
  clientJson,
  clientFailure,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { callExternalProcessApi } from "@/lib/lawyerProcesses/processServer";
import { normalizeOABNumber, normalizeUF } from "@/lib/oab";
import { normalizeProcessNumber } from "@/lib/lawyerProcesses/processValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Extrai um array de uma resposta da API externa que pode aninhar a lista em
 * diferentes chaves (ex.: { data: { processos: [...] } } ou { processos: [...] }).
 *
 * Retorna o primeiro array encontrado nas chaves informadas. Se `source` já for
 * um array, ele é retornado diretamente. Caso contrário, devolve `null` para
 * permitir encadear fallbacks com o operador `||`.
 */
function pickExternalList(source, keys = []) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return null;

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
  }
  return null;
}

/**
 * Consulta a API externa pelos processos vinculados à OAB e persiste até 20
 * registros na tabela `lawyer_oab_processes`.
 *
 * Executado de forma SÍNCRONA (com await) no fluxo do POST para garantir que os
 * processos já estejam disponíveis quando o front-end recarregar a lista. Em
 * ambientes serverless, jobs "fire-and-forget" podem ser encerrados antes de
 * concluir, o que fazia a tela ficar carregando sem nunca trazer resultados.
 *
 * Retorna a quantidade de processos efetivamente salvos.
 */
async function downloadOabProcesses(access, oabNumber, ufState) {
  console.log(
    `[OAB/Monitoramento] Iniciando download de processos da OAB para o advogado ${access.profile.id} (OAB: ${oabNumber}-${ufState})...`
  );

  const external = await callExternalProcessApi("/api/publico/oab/processos", {
    oab: oabNumber,
    uf: ufState,
    estado: ufState,
    numero: oabNumber,
    numero_oab: oabNumber,
  });

  let rawList = [];
  if (external.ok && external.payload?.success) {
    // IMPORTANTE: a API externa retorna { success, data: { processos: [...] } }.
    // Garantimos que `rawList` seja SEMPRE o array de processos e nunca o objeto
    // de dados inteiro (que faria .slice() retornar vazio).
    rawList =
      pickExternalList(external.payload.data, ["processos"]) ||
      pickExternalList(external.payload, ["processos", "data"]) ||
      [];
    console.log(`[OAB/Monitoramento] ${rawList.length} processos encontrados. Salvando até 20...`);
  } else {
    console.warn(
      "[OAB/Monitoramento] A consulta de processos na API externa falhou ou retornou erro:",
      external.payload
    );
  }

  // Limita a 20 processos.
  const limitList = rawList.slice(0, 20);
  let savedCount = 0;

  for (const p of limitList) {
    const rawCnj = p?.numero_cnj || p?.numero || p?.numero_processo || p?.cnj || "";
    const cnj = normalizeProcessNumber(rawCnj);

    if (cnj) {
      const { error: insertError } = await access.db
        .from("lawyer_oab_processes")
        .upsert(
          {
            lawyer_id: access.profile.id,
            numero_cnj: cnj,
            metadata: p,
            monitored: false,
            imported: false,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "lawyer_id,numero_cnj",
          }
        );

      if (insertError) {
        console.error(`[OAB/Monitoramento] Erro ao salvar o processo ${cnj}:`, insertError.message);
      } else {
        savedCount += 1;
      }
    }
  }

  console.log(`[OAB/Monitoramento] Download concluído. ${savedCount} processos salvos.`);
  return savedCount;
}

export async function GET(request) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    // Fetch lawyer profile details for OAB info
    const { data: lawyer, error: dbError } = await access.db
      .from("advogados")
      .select("oab, estado, oab_processos_baixados, oab_monitoramento_citacoes")
      .eq("id", access.profile.id)
      .maybeSingle();

    if (dbError) throw dbError;

    // Fetch processes downloaded from OAB
    let { data: processes, error: procError } = await access.db
      .from("lawyer_oab_processes")
      .select("*")
      .eq("lawyer_id", access.profile.id)
      .order("created_at", { ascending: false });

    if (procError) throw procError;

    const oabNumber = lawyer?.oab || "";
    const ufState = lawyer?.estado || "";

    // Fetch citations events from n8n API if monitoring is active
    let citations = [];
    if (lawyer?.oab_monitoramento_citacoes && oabNumber && ufState) {
      try {
        const external = await callExternalProcessApi("/api/plataformas/eventos", {
          plataforma_ref: access.profile.id,
          type: "oab"
        });

        if (external.ok && external.payload?.success) {
          // A API externa pode retornar os eventos em formatos distintos.
          // Priorizamos sempre um array; nunca atribuímos um objeto a `citations`.
          const payloadData = external.payload.data;
          citations = pickExternalList(payloadData, ["eventos", "citacoes", "processos"]) ||
            pickExternalList(external.payload, ["eventos", "citacoes"]) ||
            [];
        } else {
          console.warn("[OAB/Monitoramento][GET] A consulta de citações na API externa retornou erro:", external.payload);
        }
      } catch (apiError) {
        console.error("[OAB/Monitoramento][GET] Erro de rede ao conectar na API de eventos externa:", apiError);
      }
    }

    return clientJson({
      success: true,
      oab_processos_baixados: Boolean(lawyer?.oab_processos_baixados),
      oab_monitoramento_citacoes: Boolean(lawyer?.oab_monitoramento_citacoes),
      oab: oabNumber,
      uf: ufState,
      processes: processes || [],
      citations: citations
    });
  } catch (error) {
    console.error("[OAB/Monitoramento][GET] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar os dados de monitoramento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function POST(request) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // Action: Mark citation as read
    if (action === "marcar_lido") {
      const { id } = body;
      if (!id) {
        return clientJson({ success: false, message: "ID do evento é obrigatório." }, 400);
      }

      try {
        const external = await callExternalProcessApi("/api/plataformas/eventos/marcar-lido", {
          id: id,
          plataforma_ref: access.profile.id
        });

        if (!external.ok || !external.payload?.success) {
          console.error("[OAB/Monitoramento][POST][MarcarLido] External API failure:", external.payload);
          return clientJson({ 
            success: false, 
            message: external.payload?.message || "Erro ao marcar citação como lida na API externa." 
          }, external.status || 502);
        }

        return clientJson({
          success: true,
          message: "Citação marcada como lida com sucesso."
        });
      } catch (apiError) {
        console.error("[OAB/Monitoramento][POST][MarcarLido] API Error:", apiError);
        return clientJson({ success: false, message: "Não foi possível conectar à API de eventos." }, 502);
      }
    }

    // Action: Save preferences
    const { baixar_processos, monitorar_citacoes } = body;

    // Fetch lawyer profile details for OAB info
    const { data: lawyer, error: dbError } = await access.db
      .from("advogados")
      .select("oab, estado")
      .eq("id", access.profile.id)
      .maybeSingle();

    if (dbError) throw dbError;

    const oabNumber = normalizeOABNumber(lawyer?.oab || "");
    const ufState = normalizeUF(lawyer?.estado || "");

    if (!oabNumber || !ufState) {
      return clientJson({
        success: false,
        message: "O advogado precisa ter OAB e UF preenchidos em seu perfil para habilitar o monitoramento."
      }, 400);
    }

    // Update flags in database
    const updates = {};
    if (baixar_processos !== undefined) {
      updates.oab_processos_baixados = baixar_processos;
    }
    if (monitorar_citacoes !== undefined) {
      updates.oab_monitoramento_citacoes = monitorar_citacoes;
    }

    const { error: updateError } = await access.db
      .from("advogados")
      .update(updates)
      .eq("id", access.profile.id);

    if (updateError) throw updateError;

    // Se o download de processos foi habilitado, executa a busca de forma
    // síncrona (aguardando a conclusão) para que os processos já estejam
    // disponíveis quando o front-end recarregar a lista.
    let processesDownloaded = null;
    if (baixar_processos) {
      try {
        processesDownloaded = await downloadOabProcesses(access, oabNumber, ufState);
      } catch (downloadError) {
        console.error("[OAB/Monitoramento] Erro ao baixar processos da OAB:", downloadError);
      }
    }

    // Sincroniza a ativação ou desativação do monitoramento de citações da OAB na API externa
    if (monitorar_citacoes !== undefined) {
      try {
        console.log(`[OAB/Monitoramento] Sincronizando monitoramento da OAB: ${oabNumber}-${ufState}. Ativo: ${monitorar_citacoes}`);
        const external = await callExternalProcessApi("/api/plataformas/monitoramentos", {
          tipo: "oab",
          type: "oab",
          tipo_monitoramento: "oab",
          oab: oabNumber,
          uf: ufState,
          estado: ufState,
          plataforma_ref: access.profile.id,
          ativo: Boolean(monitorar_citacoes)
        });

        if (!external.ok || !external.payload?.success) {
          console.warn("[OAB/Monitoramento] Resposta da API externa ao sincronizar monitoramento da OAB não foi bem sucedida:", external.payload);
        }
      } catch (monitorError) {
        console.error("[OAB/Monitoramento] Erro de rede ao sincronizar monitoramento da OAB na API externa:", monitorError);
      }
    }

    return clientJson({
      success: true,
      message: "Configurações atualizadas com sucesso.",
      processes_downloaded: processesDownloaded
    });
  } catch (error) {
    console.error("[OAB/Monitoramento][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível atualizar as configurações.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
