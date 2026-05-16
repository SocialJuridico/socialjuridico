import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ensureDb } from '@/lib/dbSignatureHelper';

export async function POST(request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { signature_id, role, code } = body;

    if (!signature_id || !role || !code) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // 1. Busca os detalhes da assinatura no banco de dados
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
    const otherRole = role === 'lawyer' ? 'client' : 'lawyer';
    const otherParty = meta[otherRole];

    if (!targetParty || !targetParty.otp) {
      return NextResponse.json({ success: false, message: "Nenhum código OTP foi enviado para este signatário" }, { status: 400 });
    }

    if (targetParty.signed) {
      return NextResponse.json({ success: false, message: "Este signatário já realizou a assinatura" }, { status: 400 });
    }

    // 2. Valida o código OTP e expiração
    const now = new Date();
    const expiresAt = new Date(targetParty.otp_expires);

    if (targetParty.otp !== code.trim()) {
      return NextResponse.json({ success: false, message: "Código de verificação incorreto" }, { status: 400 });
    }

    if (now > expiresAt) {
      return NextResponse.json({ success: false, message: "Código de verificação expirou" }, { status: 400 });
    }

    // 3. Atualiza os dados de assinatura do signatário atual
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Navegador Desconhecido";
    const signatureDate = new Date().toISOString();

    meta[role] = {
      ...targetParty,
      signed: true,
      signed_at: signatureDate,
      ip: clientIp,
      user_agent: userAgent,
      otp: null, // Limpa o OTP usado
      otp_expires: null
    };

    meta.history.push({
      event: `${role}_signed`,
      timestamp: signatureDate,
      details: `Documento assinado eletronicamente por ${targetParty.name} (IP: ${clientIp})`
    });

    // 4. Inicia a modificação do PDF utilizando pdf-lib
    const originalPdfUrl = sig.document_url;
    if (!originalPdfUrl) {
      return NextResponse.json({ success: false, message: "URL do documento original não encontrada" }, { status: 400 });
    }

    // Baixa o PDF original
    const pdfResponse = await fetch(originalPdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Erro ao baixar PDF do Storage: ${pdfResponse.statusText}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Carrega o PDF na biblioteca pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Carrega fontes padrões do PDF
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Configurações de layout do carimbo
    const stampWidth = 240;
    const stampHeight = 65;
    
    // Posição X: Advogado na esquerda, Cliente na direita
    const xPosition = role === 'lawyer' ? 40 : width - stampWidth - 40;
    const yPosition = 40; // Margem inferior de 40px

    // --- DESENHAR O CARIMBO VISUAL ---
    
    // 1. Fundo Branco para cobrir qualquer texto abaixo e garantir legibilidade
    lastPage.drawRectangle({
      x: xPosition,
      y: yPosition,
      width: stampWidth,
      height: stampHeight,
      color: rgb(1, 1, 1),
    });

    // 2. Bordas Duplas (Estilo GOV.BR mas com cores exclusivas)
    // Borda Externa (Dourado Claro)
    lastPage.drawRectangle({
      x: xPosition,
      y: yPosition,
      width: stampWidth,
      height: stampHeight,
      borderColor: rgb(0.77, 0.63, 0.35), // Dourado (#c5a059)
      borderWidth: 1.5,
    });
    // Borda Interna (Linha fina dourada)
    lastPage.drawRectangle({
      x: xPosition + 3,
      y: yPosition + 3,
      width: stampWidth - 6,
      height: stampHeight - 6,
      borderColor: rgb(0.88, 0.8, 0.63),
      borderWidth: 0.5,
    });

    // 3. Logo do SocialJurídico (Quadrado Dourado com texto "SJ" em vetor para máxima nitidez)
    const logoSize = 34;
    const logoX = xPosition + 10;
    const logoY = yPosition + (stampHeight - logoSize) / 2;

    lastPage.drawRectangle({
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
      color: rgb(0.77, 0.63, 0.35),
      borderRadius: 4,
    });
    
    lastPage.drawText("SJ", {
      x: logoX + 8,
      y: logoY + 10,
      size: 14,
      font: fontHelveticaBold,
      color: rgb(1, 1, 1),
    });

    // 4. Textos do Carimbo de Assinatura
    const textX = xPosition + logoSize + 20;
    const startY = yPosition + stampHeight - 12;

    // Linha 1: "Documento assinado digitalmente"
    lastPage.drawText("Documento assinado digitalmente", {
      x: textX,
      y: startY,
      size: 6.5,
      font: fontHelveticaBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Linha 2: Nome do Signatário (Mais destacado)
    const displayName = targetParty.name.toUpperCase().substring(0, 32);
    lastPage.drawText(displayName, {
      x: textX,
      y: startY - 10,
      size: 7.5,
      font: fontHelveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Linha 3: Data e Hora da Assinatura (Fuso horário de Brasília -0300)
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date(signatureDate));

    lastPage.drawText(`Data: ${formattedDate}-0300`, {
      x: textX,
      y: startY - 20,
      size: 6.5,
      font: fontHelvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Linha 4: Link de Validação
    lastPage.drawText("Verifique em socialjuridico.com.br/validar", {
      x: textX,
      y: startY - 30,
      size: 5.8,
      font: fontHelvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Linha 5: Código de Validação do Documento
    lastPage.drawText(`Código: ${sig.verification_code}`, {
      x: textX,
      y: startY - 40,
      size: 6.5,
      font: fontHelveticaBold,
      color: rgb(0.77, 0.63, 0.35),
    });

    // Salva o PDF modificado em bytes
    const pdfBytes = await pdfDoc.save();

    // 5. Calcula o HASH SHA-256 da versão assinada
    const signedHash = crypto.createHash("sha256").update(pdfBytes).digest("hex");

    // 6. Faz o upload da nova versão assinada de volta para o Supabase Storage (Substitui ou cria uma versão de assinatura)
    const filePath = `signatures/signed_${signature_id}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error("Erro ao subir PDF assinado para o Storage:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from("crm_documents").getPublicUrl(filePath);

    // 7. Determina o novo status da assinatura
    // Se a outra parte já assinou, vira 'signed', senão vira 'partially_signed'
    const isCompleted = otherParty.signed;
    const finalStatus = isCompleted ? 'signed' : 'partially_signed';

    if (isCompleted) {
      meta.history.push({
        event: "completed",
        timestamp: new Date().toISOString(),
        details: "Todas as partes assinaram o documento. Processo finalizado."
      });
    }

    // 8. Salva todas as atualizações no Banco de Dados
    const { error: dbError } = await supabaseAdmin
      .from('assinaturas_digitais')
      .update({
        status: finalStatus,
        document_url: publicUrl,
        signed_hash: signedHash,
        metadata: meta
      })
      .eq('id', signature_id);

    if (dbError) throw dbError;

    // 9. Se finalizado, gera uma notificação interna para o Advogado informando que o documento foi assinado!
    if (isCompleted) {
      try {
        await supabaseAdmin.from('notificacoes').insert([{
          user_id: sig.lawyer_id,
          titulo: "Documento Assinado por Completo! ✍️",
          mensagem: `O documento "${sig.document_name}" foi completamente assinado por você e pelo cliente ${otherParty.name}.`,
          tipo: "CRM_SIGNATURE",
          lida: false,
          created_at: new Date().toISOString()
        }]);
      } catch (notifErr) {
        console.error("Erro ao criar notificação de assinatura completa:", notifErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Documento assinado com sucesso!",
      data: {
        status: finalStatus,
        document_url: publicUrl,
        signed_hash: signedHash
      }
    });

  } catch (error) {
    console.error("Erro na API POST /api/crm/assinatura/validar-otp:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro ao processar assinatura eletrônica" }, { status: 500 });
  }
}
