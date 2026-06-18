import OpenAI from "openai";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const TONE_LABELS = Object.freeze({
  formal: "formal, objetivo e institucional",
  conciliador: "conciliador, buscando solução amigável sem perder firmeza",
  firme: "firme e assertivo, com linguagem técnica e postura resolutiva",
  urgente: "urgente, claro quanto ao prazo e às consequências jurídicas",
});

function normalizeText(value, maxLength = 12000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function buildPrompt({ content, tone, clientName, authorName }) {
  const toneLabel = TONE_LABELS[tone] || TONE_LABELS.formal;
  return `Você é um advogado brasileiro sênior redigindo uma NOTIFICAÇÃO EXTRAJUDICIAL para revisão humana obrigatória.

TAREFA
Redigir uma minuta completa de notificação extrajudicial em português do Brasil.

TOM
Use tom ${toneLabel}.

DADOS DISPONÍVEIS
- Notificante/responsável técnico: ${authorName || "DADO A COMPLETAR"}
- Destinatário ou parte relacionada: ${clientName || "DADO A COMPLETAR"}

REGRAS DE FORMATO
1. Use o título "NOTIFICAÇÃO EXTRAJUDICIAL".
2. Estruture com: identificação das partes, exposição dos fatos, fundamentos/razões da notificação, exigência objetiva, prazo para cumprimento, consequências do descumprimento, local/data e assinatura.
3. Não invente CPF, CNPJ, RG, endereço, número de contrato, processo, valores, datas, e-mails ou telefones.
4. Quando faltar dado indispensável, escreva "DADO A COMPLETAR" exatamente no ponto em que o usuário deve preencher.
5. Não use Markdown, asteriscos, hashtags, tabelas ou comentários sobre o funcionamento da IA.
6. Não dê aconselhamento fora da minuta. Gere apenas o texto final da notificação.
7. Preserve os fatos narrados pelo usuário e não crie acusações além do que foi informado.

CONTEÚDO INFORMADO PELO USUÁRIO
${content}`;
}

export async function POST(request) {
  try {
    if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
      return signatureProductJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }

    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    if (!openai) {
      return signatureProductJson({ success: false, message: "O serviço de IA não está disponível agora." }, 503);
    }

    // Check plan limits (FREE plan has 0 quota)
    const { data: subscription, error: subError } = await access.db
      .from("signature_subscriptions")
      .select("plan_code")
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (subError) throw subError;

    const planCode = subscription?.plan_code || "FREE";
    if (planCode === "FREE") {
      return signatureProductJson({ success: false, message: "O plano Gratuito não permite o uso do gerador de Notificação com IA." }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const content = normalizeText(body.content, 12000);
    const tone = String(body.tone || "formal").trim().toLowerCase();
    const clientName = normalizeText(body.clientName, 160);

    if (content.length < 40) {
      return signatureProductJson({ success: false, message: "Descreva os fatos com mais detalhes para a IA gerar a notificação." }, 400);
    }

    const { data: account } = await access.db
      .from("signature_accounts")
      .select("full_name")
      .eq("user_id", access.user.id)
      .maybeSingle();

    const authorName = account?.full_name || "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você redige minutas jurídicas brasileiras com rigor técnico e revisão humana obrigatória.",
        },
        {
          role: "user",
          content: buildPrompt({
            content,
            tone,
            clientName,
            authorName,
          }),
        },
      ],
      temperature: 0.45,
    });

    const draftText = normalizeText(completion.choices[0]?.message?.content || "", 50000);
    if (!draftText) {
      return signatureProductJson({ success: false, message: "A IA não retornou uma notificação válida." }, 502);
    }

    return signatureProductJson({ success: true, draftText });
  } catch (error) {
    console.error("[Signature NotificacaoExtrajudicial/IA][POST] Erro:", error);
    return signatureProductJson({ success: false, message: "Não foi possível gerar a notificação extrajudicial com IA." }, 500);
  }
}
