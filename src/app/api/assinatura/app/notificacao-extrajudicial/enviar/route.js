import crypto from "node:crypto";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import { resend } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "signature-documents";

const PLAN_NOTIFICATION_LIMITS = {
  FREE: 0,
  ESSENTIAL: 2,
  PROFESSIONAL: 5,
  BUSINESS: 10,
  UNLIMITED: null, // Unlimited
};

const PLAN_LABELS = {
  FREE: "Gratuito",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Negócios",
  UNLIMITED: "Ilimitado",
};

function safePdfText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+$/gm, "");
}

function validateFile(file) {
  if (!file) return null;
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  const extension = String(file.name || "").split(".").pop()?.toLowerCase();
  const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);
  if (!allowedTypes.has(file.type) && !allowedExtensions.has(extension)) {
    return "Envie um arquivo PDF, JPG ou PNG.";
  }
  if (file.size > 15 * 1024 * 1024) {
    return "O arquivo deve ter no máximo 15 MB.";
  }
  return null;
}

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
  }

  let access;
  let notificationId = null;
  let storagePath = null;

  try {
    access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const draftText = formData.get("draft_text");
    const recipientEmail = String(formData.get("recipient_email") || "").trim().toLowerCase();
    const tone = String(formData.get("tone") || "formal").trim();
    const caseId = formData.get("case_id") ? String(formData.get("case_id")).trim() : null;

    if (!file && !draftText) {
      return signatureProductJson({ success: false, message: "É necessário fornecer um arquivo ou redigir uma minuta." }, 400);
    }
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return signatureProductJson({ success: false, message: "E-mail do destinatário inválido." }, 400);
    }

    if (file) {
      const fileError = validateFile(file);
      if (fileError) return signatureProductJson({ success: false, message: fileError }, 400);
    }

    // 1. Validate Plan and Quotas
    const { data: subscription, error: subError } = await access.db
      .from("signature_subscriptions")
      .select("plan_code")
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (subError) throw subError;

    const planCode = subscription?.plan_code || "FREE";
    const limit = PLAN_NOTIFICATION_LIMITS[planCode] ?? 0;

    // Load active usage period to count used notifications
    const { data: usage, error: usageError } = await access.db
      .from("signature_usage_periods")
      .select("extrajudicial_notifications_used, period_start")
      .eq("organization_id", access.organizationId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (usageError) throw usageError;

    const used = usage ? (usage.extrajudicial_notifications_used ?? 0) : 0;

    if (limit !== null && used >= limit) {
      return signatureProductJson(
        {
          success: false,
          code: "NOTIFICATION_LIMIT_REACHED",
          message: `Você atingiu o limite de ${limit} envios de notificação extrajudicial do seu plano ${PLAN_LABELS[planCode]}. Faça upgrade para continuar.`,
        },
        403
      );
    }

    // 2. Prepare files and PDF
    const protocol = `NTF${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const accessToken = crypto.randomUUID();
    let fileBuffer;
    let fileName;
    let fileHash;
    let fileExt = "pdf";

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      fileHash = crypto.createHash("sha512").update(fileBuffer).digest("hex");
      fileExt = file.name.split(".").pop() || "pdf";
    } else {
      // Generate standard PDF from draft text using jsPDF
      const { jsPDF } = require("jspdf");
      const docPdf = new jsPDF();
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const pageHeight = docPdf.internal.pageSize.getHeight();

      // Top green header band
      docPdf.setFillColor(0, 200, 118);
      docPdf.rect(0, 0, pageWidth, 15, "F");

      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(14);
      docPdf.setTextColor(255, 255, 255);
      docPdf.text("NOTIFICAÇÃO EXTRAJUDICIAL", 15, 10);

      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(10);
      docPdf.setTextColor(50, 50, 50);

      const cleanedDraft = safePdfText(draftText)
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/^---\s*$/gm, "")
        .trim();

      const splitContent = docPdf.splitTextToSize(cleanedDraft, pageWidth - 40);
      let y = 30;
      for (const line of splitContent) {
        if (y > pageHeight - 20) {
          docPdf.addPage();
          y = 20;
        }
        docPdf.text(line, 20, y);
        y += 6;
      }

      const arrayBuffer = docPdf.output("arraybuffer");
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = `Notificacao_${protocol}.pdf`;
      fileHash = crypto.createHash("sha512").update(fileBuffer).digest("hex");
    }

    notificationId = crypto.randomUUID();
    storagePath = `${access.organizationId}/notifications/${notificationId}.${fileExt.toLowerCase()}`;

    const mimeTypes = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const contentType = mimeTypes[fileExt.toLowerCase()] || "application/octet-stream";

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await access.db.storage.from(BUCKET).upload(storagePath, fileBuffer, {
      contentType,
      cacheControl: "0",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    // 4. Save to DB Table
    const docData = {
      id: notificationId,
      organization_id: access.organizationId,
      created_by: access.user.id,
      recipient_email: recipientEmail,
      protocol,
      access_token: accessToken,
      status: "SENT",
      file_bucket: BUCKET,
      file_path: storagePath,
      file_name: fileName,
      mime_type: contentType,
      size_bytes: fileBuffer.length,
      hash_sha512: fileHash,
      tone,
      case_id: caseId,
    };

    const { data: insertedDoc, error: insertError } = await access.db
      .from("signature_extrajudicial_notifications")
      .insert([docData])
      .select()
      .single();

    if (insertError) {
      // Rollback file upload
      await access.db.storage.from(BUCKET).remove([storagePath]);
      throw insertError;
    }

    // 5. Update usage count in usage period
    if (usage) {
      const { error: usagePeriodErr } = await access.db
        .from("signature_usage_periods")
        .update({ extrajudicial_notifications_used: used + 1 })
        .eq("organization_id", access.organizationId)
        .eq("period_start", usage.period_start);
      if (usagePeriodErr) console.error("Erro ao incrementar contador:", usagePeriodErr);
    }

    // 6. Send email using Resend
    const publicBaseUrl = SITE_URL || "https://socialjuridico.com.br";
    const trackingLink = `${publicBaseUrl}/assinatura/notificacao/${accessToken}`;

    // Load account details to put sender name in email
    const { data: account } = await access.db
      .from("signature_accounts")
      .select("full_name")
      .eq("user_id", access.user.id)
      .maybeSingle();

    const senderName = account?.full_name ? `por ${account.full_name}` : "";

    try {
      await resend.emails.send({
        from: "Social Jurídico Assinatura <contato@socialjuridico.com.br>",
        to: recipientEmail,
        subject: `[NOTIFICAÇÃO EXTRAJUDICIAL] Você recebeu uma notificação importante`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #00c853; margin-top: 0;">Notificação Extrajudicial</h2>
            <p>Olá,</p>
            <p>Você recebeu uma Notificação Extrajudicial Digital enviada ${senderName} através da plataforma Social Jurídico.</p>
            <p>Este documento possui validade e sua entrega está sendo rastreada e documentada eletronicamente para fins de cadeia de custódia.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${trackingLink}" style="background: #00c853; color: #000; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Visualizar Notificação</a>
            </p>
            <p style="font-size: 0.8rem; color: #999;">Se o botão acima não funcionar, copie e cole o link abaixo em seu navegador:<br>${trackingLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 0.75rem; color: #aaa; margin: 0;">Protocolo: <strong>${protocol}</strong></p>
            <p style="font-size: 0.75rem; color: #aaa; margin: 5px 0 0 0;">Criptografia SHA-512: ${fileHash.slice(0, 32)}...</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao disparar email via Resend:", emailError);
      // Update status to error if we couldn't send the email
      await access.db
        .from("signature_extrajudicial_notifications")
        .update({ status: "ERROR" })
        .eq("id", notificationId);
      return signatureProductJson({ success: false, message: "Houve uma falha ao enviar o e-mail da notificação." }, 502);
    }

    return signatureProductJson({
      success: true,
      message: "Notificação extrajudicial enviada com sucesso!",
      data: {
        id: insertedDoc.id,
        protocol: insertedDoc.protocol,
        hash: insertedDoc.hash_sha512,
        createdAt: insertedDoc.created_at,
      },
    });
  } catch (error) {
    console.error("[Signature NotificacaoExtrajudicial/Enviar][POST] Erro:", error);
    return signatureProductJson({ success: false, message: "Não foi possível processar o envio da notificação." }, 500);
  }
}
