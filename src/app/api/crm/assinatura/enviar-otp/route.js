import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { ensureDb } from '@/lib/dbSignatureHelper';

export async function POST(request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { signature_id, role, is_otp_request } = body; // role: 'lawyer' ou 'client'

    if (!signature_id || !role || (role !== 'lawyer' && role !== 'client')) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes ou inválidos" }, { status: 400 });
    }

    // 1. Busca os detalhes da assinatura
    const { data: sig, error: fetchError } = await supabaseAdmin
      .from('assinaturas_digitais')
      .select('*')
      .eq('id', signature_id)
      .maybeSingle();

    if (fetchError || !sig) {
      return NextResponse.json({ success: false, message: "Processo de assinatura não encontrado" }, { status: 404 });
    }

    const meta = typeof sig.metadata === 'string' ? JSON.parse(sig.metadata) : sig.metadata;
    const targetParty = meta[role];

    if (!targetParty || !targetParty.email) {
      return NextResponse.json({ success: false, message: "Dados do signatário não encontrados" }, { status: 400 });
    }

    if (targetParty.signed) {
      return NextResponse.json({ success: false, message: "Este signatário já assinou este documento" }, { status: 400 });
    }

    // 2. Gera o código OTP de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Expira em 10 minutos

    // 3. Atualiza os metadados com o código OTP
    meta[role] = {
      ...targetParty,
      otp: otpCode,
      otp_expires: otpExpires
    };

    meta.history.push({
      event: `otp_sent_${role}`,
      timestamp: new Date().toISOString(),
      details: `Código de verificação enviado para o e-mail: ${targetParty.email}`
    });

    const { error: updateError } = await supabaseAdmin
      .from('assinaturas_digitais')
      .update({ metadata: meta })
      .eq('id', signature_id);

    if (updateError) throw updateError;

    // 4. Envia o e-mail usando o Resend com um design premium e elegante
    const isOtpRequest = role === 'lawyer' || is_otp_request === true;
    const subject = isOtpRequest
      ? `[Social Jurídico] Seu código de assinatura eletrônica: ${otpCode}` 
      : `[Social Jurídico] Assinatura eletrônica de documento pendente`;

    const origin = request.headers.get('origin') || request.headers.get('referer');
    let siteUrl = '';
    if (origin) {
      try {
        const urlObj = new URL(origin);
        siteUrl = urlObj.origin;
      } catch (e) {
        // Fallback
      }
    }
    if (!siteUrl) {
      const host = request.headers.get('host') || 'localhost:3000';
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      siteUrl = `${proto}://${host}`;
    }
    const signLink = `${siteUrl}/assinatura/${signature_id}?role=${role}`;

    const htmlContent = isOtpRequest
      ? `
        <div style="font-family: sans-serif; padding: 30px; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e0d0b0; border-radius: 12px; background: #fff;">
          <h2 style="color: #c5a059; border-bottom: 2px solid #e0d0b0; padding-bottom: 10px; font-weight: 800; font-size: 1.6rem; margin-top: 0;">Social Jurídico</h2>
          <p style="font-size: 1.1rem; line-height: 1.6; color: #333;">Prezado(a) <strong>${targetParty.name}</strong>,</p>
          <p style="font-size: 1rem; line-height: 1.6; color: #555;">Você solicitou a validação de assinatura eletrônica para o documento: <br><strong style="color: #222;">${sig.document_name}</strong>.</p>
          
          <div style="background: #fbf9f4; border: 1px solid #e0d0b0; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
            <p style="margin: 0 0 10px 0; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; color: #887040; font-weight: bold;">Seu Código de Assinatura</p>
            <h1 style="margin: 0; font-size: 3rem; color: #c5a059; letter-spacing: 5px; font-family: monospace; font-weight: 800;">${otpCode}</h1>
            <p style="margin: 15px 0 0 0; font-size: 0.85rem; color: #999;">Este código expira em 10 minutos.</p>
          </div>

          <p style="font-size: 0.9rem; color: #666; line-height: 1.5;">Esta assinatura possui validade legal e integridade criptográfica assegurada nos termos da legislação brasileira vigente.</p>
          <hr style="border: 0; border-top: 1px solid #eef; margin: 30px 0;" />
          <p style="font-size: 0.8rem; color: #aaa; text-align: center;">Social Jurídico - Tecnologia Segura para Documentos Digitais.</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; padding: 30px; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e0d0b0; border-radius: 12px; background: #fff;">
          <h2 style="color: #c5a059; border-bottom: 2px solid #e0d0b0; padding-bottom: 10px; font-weight: 800; font-size: 1.6rem; margin-top: 0;">Social Jurídico</h2>
          <p style="font-size: 1.1rem; line-height: 1.6; color: #333;">Prezado(a) <strong>${targetParty.name}</strong>,</p>
          <p style="font-size: 1rem; line-height: 1.6; color: #555;">Você recebeu uma solicitação de assinatura eletrônica enviada pela plataforma do <strong>Social Jurídico</strong> para o documento: <br><strong style="color: #222;">${sig.document_name}</strong>.</p>
          
          <div style="background: #fbf9f4; border: 1px solid #e0d0b0; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
            <p style="margin: 0 0 15px 0; font-size: 1rem; color: #555;">Para visualizar o documento e realizar a sua assinatura eletrônica segura, clique no botão abaixo:</p>
            <p style="margin: 20px 0 0 0;">
              <a href="${signLink}" style="background: linear-gradient(135deg, #c5a059 0%, #b28a3a 100%); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: inline-block; box-shadow: 0 4px 10px rgba(197, 160, 89, 0.25);">Visualizar e Assinar Documento</a>
            </p>
            <p style="margin: 15px 0 0 0; font-size: 0.85rem; color: #999;">Uma vez na página, você receberá o código numérico de 6 dígitos no seu e-mail para validar a sua assinatura.</p>
          </div>

          <p style="font-size: 0.9rem; color: #666; line-height: 1.5;">A assinatura digital realizada na nossa plataforma conta com autenticidade de dados, registro de IP, rastreabilidade e validade jurídica plena de acordo com a legislação federal.</p>
          <hr style="border: 0; border-top: 1px solid #eef; margin: 30px 0;" />
          <p style="font-size: 0.8rem; color: #999;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br><a href="${signLink}" style="color: #c5a059;">${signLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #eef; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #aaa; text-align: center;">Social Jurídico - Tecnologia Segura para Documentos Digitais.</p>
        </div>
      `;

    await resend.emails.send({
      from: 'Social Jurídico <contato@socialjuridico.com.br>',
      to: targetParty.email,
      subject: subject,
      html: htmlContent
    });

    return NextResponse.json({ success: true, message: "Código OTP enviado com sucesso!" });

  } catch (error) {
    console.error("Erro na API POST /api/crm/assinatura/enviar-otp:", error);
    return NextResponse.json({ success: false, message: "Erro ao disparar código de verificação" }, { status: 500 });
  }
}
