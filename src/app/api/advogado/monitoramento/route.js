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
          citations = external.payload.data || external.payload.eventos || [];
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

    // If downloading processes is enabled, trigger background job
    if (baixar_processos) {
      // Run background job asynchronously
      (async () => {
        try {
          console.log(`[OAB/Monitoramento][Background] Starting OAB processes download for lawyer ${access.profile.id} (OAB: ${oabNumber}-${ufState})...`);
          
          const external = await callExternalProcessApi("/api/publico/oab/processos", {
            oab: oabNumber,
            uf: ufState,
            estado: ufState,
            numero: oabNumber,
            numero_oab: oabNumber
          });

          let rawList = [];
          if (external.ok && external.payload?.success) {
            rawList = external.payload.data || external.payload.processos || [];
            console.log(`[OAB/Monitoramento][Background] Found ${rawList.length} processes. Storing up to 20...`);
          } else if (process.env.ENABLE_MONITORAMENTO_MOCKS === "true") {
            console.warn("[OAB/Monitoramento][Background] External API returned maintenance page or HTML. Falling back to test mock processes...");
            rawList = [
              {
                numero_cnj: `5001234-56.2026.8.21.0001`,
                capa: {
                  classe: "Procedimento Comum Cível",
                  orgao_julgador: "1ª Vara Cível de Porto Alegre",
                  sistema: "eproc",
                  formato: "Eletrônico",
                  data_ajuizamento: "2026-03-10T14:30:00Z"
                },
                tribunal: { nome: "Tribunal de Justiça do Rio Grande do Sul", codigo: "TJRS", alias_datajud: "TJRS" },
                partes: [
                  { nome: "João da Silva", polo: "Ativo", tipo_parte: "Autor", documento: "12345678909" },
                  { nome: "Banco do Brasil S/A", polo: "Passivo", tipo_parte: "Réu", documento: "00000000000191" }
                ],
                ultimas_movimentacoes: [
                  { data: "2026-06-20T10:00:00Z", titulo: "Decisão Proferida", detalhe: "Deferida a antecipação de tutela pleiteada." },
                  { data: "2026-06-15T14:30:00Z", titulo: "Petição Inicial Protocolada", detalhe: "Ajuizada ação ordinária cível." }
                ]
              },
              {
                numero_cnj: `5007890-12.2025.8.21.0001`,
                capa: {
                  classe: "Ação Monitória",
                  orgao_julgador: "4ª Vara Cível de Porto Alegre",
                  sistema: "eproc",
                  formato: "Eletrônico",
                  data_ajuizamento: "2025-11-05T09:15:00Z"
                },
                tribunal: { nome: "Tribunal de Justiça do Rio Grande do Sul", codigo: "TJRS", alias_datajud: "TJRS" },
                partes: [
                  { nome: "Maria de Souza", polo: "Ativo", tipo_parte: "Autor", documento: "98765432100" },
                  { nome: "Comércio de Roupas Ltda", polo: "Passivo", tipo_parte: "Réu", documento: "11222333000144" }
                ],
                ultimas_movimentacoes: [
                  { data: "2026-05-18T16:00:00Z", titulo: "Expedição de Mandado", detalhe: "Mandado de citação expedido com sucesso." }
                ]
              },
              {
                numero_cnj: `5012345-67.2026.8.21.0001`,
                capa: {
                  classe: "Execução de Título Extrajudicial",
                  orgao_julgador: "12ª Vara Cível de Porto Alegre",
                  sistema: "eproc",
                  formato: "Eletrônico",
                  data_ajuizamento: "2026-01-20T11:00:00Z"
                },
                tribunal: { nome: "Tribunal de Justiça do Rio Grande do Sul", codigo: "TJRS", alias_datajud: "TJRS" },
                partes: [
                  { nome: "Condomínio Edifício Solar", polo: "Ativo", tipo_parte: "Autor", documento: "01020304000105" },
                  { nome: "Carlos Eduardo Santos", polo: "Passivo", tipo_parte: "Réu", documento: "44455566677" }
                ],
                ultimas_movimentacoes: [
                  { data: "2026-06-12T13:10:00Z", titulo: "Petição de Acordo", detalhe: "Partes protocolam petição conjunta de acordo." }
                ]
              }
            ];
          } else {
            console.warn("[OAB/Monitoramento][Background] External API search failed and mocks are disabled.");
          }

          // Limit to 20 processes
          const limitList = rawList.slice(0, 20);
          for (const p of limitList) {
            const rawCnj = p.numero_cnj || p.numero || p.numero_processo || p.cnj || "";
            const cnj = normalizeProcessNumber(rawCnj);
            
            if (cnj) {
              const { error: insertError } = await access.db
                .from("lawyer_oab_processes")
                .upsert({
                  lawyer_id: access.profile.id,
                  numero_cnj: cnj,
                  metadata: p,
                  monitored: false,
                  imported: false,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: "lawyer_id,numero_cnj"
                });

              if (insertError) {
                console.error(`[OAB/Monitoramento][Background] Insert error for process ${cnj}:`, insertError.message);
              }
            }
          }
          console.log("[OAB/Monitoramento][Background] Done inserting processes.");
        } catch (bgError) {
          console.error("[OAB/Monitoramento][Background] Error in background OAB download:", bgError);
        }
      })();
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
      message: "Configurações atualizadas com sucesso."
    });
  } catch (error) {
    console.error("[OAB/Monitoramento][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível atualizar as configurações.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
