import { ImageResponse } from "next/og";

import { supabaseAdmin } from "@/lib/supabase";
import {
  getIntentTier,
  INTENT_TIER_LABELS,
} from "@/lib/clientDashboard/caseIntentQuestions";
import { PRIORITY_LABELS } from "@/lib/clientDashboard/caseClassification";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadCase(id) {
  if (!supabaseAdmin || !UUID_RE.test(String(id || ""))) return null;

  const { data } = await supabaseAdmin
    .from("casos")
    .select(
      "area_atuacao, cidade, estado, prioridade, is_emergencia, intencao_fechamento, public_share_description",
    )
    .eq("id", id)
    .maybeSingle();

  return data || null;
}

export default async function OpportunityOgImage({ params }) {
  const { id } = await params;
  const caseItem = await loadCase(id);

  const area = caseItem?.area_atuacao || "Direito Geral";
  const local = [caseItem?.cidade, caseItem?.estado].filter(Boolean).join(" - ");
  const tier = getIntentTier(caseItem?.intencao_fechamento);
  const tierLabel = INTENT_TIER_LABELS[tier];
  const priorityLabel =
    caseItem?.prioridade && caseItem.prioridade !== "NORMAL"
      ? PRIORITY_LABELS[caseItem.prioridade]
      : null;
  const description =
    caseItem?.public_share_description ||
    "Nova oportunidade jurídica disponível na plataforma Social Jurídico.";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px",
          background:
            "radial-gradient(circle at 85% 10%, rgba(212,175,55,0.22), transparent 40%), #0b0b0b",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#d4af37",
            }}
          >
            Social Jurídico
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {caseItem?.is_emergencia && (
              <span
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(248,113,113,0.18)",
                  color: "#fca5a5",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                Emergência
              </span>
            )}
            {priorityLabel && (
              <span
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {priorityLabel}
              </span>
            )}
            <span
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {tierLabel}
            </span>
            <span
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(212,175,55,0.16)",
                color: "#e7ca68",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {area}
            </span>
          </div>

          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, lineHeight: 1.15 }}>
            {area}
          </div>

          {local && (
            <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.6)" }}>
              {local}
            </div>
          )}

          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.82)",
              maxHeight: 190,
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span style={{ display: "flex" }}>socialjuridico.com.br</span>
          <span
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #e1c45b, #b38b13)",
              color: "#080808",
              fontWeight: 800,
            }}
          >
            Ver oportunidade
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
