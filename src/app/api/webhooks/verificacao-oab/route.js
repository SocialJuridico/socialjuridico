import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";

export const runtime = "nodejs";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

const STATUS_MAP = {
  VERIFIED: "VERIFIED",
  ERROR: "ERROR",
  MANUAL_REVIEW: "PENDING",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload, status = 200) {
  return NextResponse.json(payload, { status });
}

function assinaturaValida(rawBody, assinaturaRecebida) {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret || !assinaturaRecebida) return false;

  const esperada = createHmac("sha256", secret).update(rawBody).digest("hex");
  const bufEsperada = Buffer.from(esperada, "hex");
  const bufRecebida = Buffer.from(assinaturaRecebida, "hex");

  if (bufEsperada.length !== bufRecebida.length) return false;
  return timingSafeEqual(bufEsperada, bufRecebida);
}

async function enviarEmailOabVerificada(lawyer) {
  if (!lawyer.email) return;

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: lawyer.email,
    subject: "Sua OAB foi verificada no Social Jurídico",
    html: `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#d4af37;">OAB verificada</h2>
        <p style="font-size:16px;">Olá${lawyer.name ? `, ${lawyer.name}` : ""}. Sua identidade e seu registro na OAB foram verificados automaticamente.</p>
        <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">
          <p style="margin:0;font-size:16px;">Seu perfil e seus chats já exibem o selo de OAB verificada. Você já pode acessar a plataforma.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("[webhooks/verificacao-oab] Falha ao enviar e-mail:", error);
  }
}

/**
 * Recebe o resultado da verificação automática de OAB
 * (validacaooab → POST /api/sessoes/{id}/enviar dispara este webhook).
 * Body: { sessao_id, advogado_id, status, motivo }
 * Header: x-signature = HMAC-SHA256(body, WEBHOOK_SIGNING_SECRET)
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return json({ success: false, message: "Serviço indisponível." }, 503);
  }

  const rawBody = await request.text();
  const assinatura = request.headers.get("x-signature");

  if (!assinaturaValida(rawBody, assinatura)) {
    return json({ success: false, message: "Assinatura inválida." }, 401);
  }

  const body = JSON.parse(rawBody || "{}");
  const advogadoId = String(body.advogado_id || "").trim();
  const statusRecebido = String(body.status || "").trim();

  if (!UUID_RE.test(advogadoId)) {
    return json({ success: false, message: "advogado_id inválido." }, 400);
  }

  const novoStatus = STATUS_MAP[statusRecebido];
  if (!novoStatus) {
    return json({ success: false, message: "status inválido." }, 400);
  }

  const { data: advogado, error: fetchError } = await supabaseAdmin
    .from("advogados")
    .select("id, name, email, oab_verification_status")
    .eq("id", advogadoId)
    .single();

  if (fetchError || !advogado) {
    return json({ success: false, message: "Advogado não encontrado." }, 404);
  }

  const jaEstavaVerificado = advogado.oab_verification_status === "VERIFIED";

  const { error: updateError } = await supabaseAdmin
    .from("advogados")
    .update({
      oab_verification_status: novoStatus,
      oab_warning_started_at:
        novoStatus === "PENDING" ? new Date().toISOString() : null,
    })
    .eq("id", advogadoId);

  if (updateError) {
    console.error("[webhooks/verificacao-oab] Falha ao atualizar advogado:", updateError);
    return json({ success: false, message: "Falha ao atualizar advogado." }, 500);
  }

  if (novoStatus === "VERIFIED" && !jaEstavaVerificado) {
    await enviarEmailOabVerificada(advogado);
  }

  return json({ success: true });
}
