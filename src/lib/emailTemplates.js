/**
 * Templates de email HTML para o SocialJurídico
 * Todos os templates seguem a identidade visual: fundo escuro, dourado (#d4af37)
 */

/**
 * Template de notificação de novo caso para advogados
 */
export function novoCasoTemplate({ titulo, area_atuacao, cidade, estado, lawyerName }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/advogado';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">⚖️ SOCIAL JURÍDICO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">NOVA OPORTUNIDADE DISPONÍVEL</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Um novo caso acaba de ser publicado na plataforma e pode ser uma excelente oportunidade para o seu escritório:
              </p>
            </td>
          </tr>

          <!-- CARD DO CASO -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                
                <!-- Título do caso -->
                <tr>
                  <td style="padding: 24px 24px 16px;">
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Título do Caso</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; line-height: 1.4;">${titulo}</p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
                  </td>
                </tr>

                <!-- Área + Localização -->
                <tr>
                  <td style="padding: 16px 24px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📋 Área de Atuação</p>
                          <p style="margin: 0; color: #d4af37; font-size: 15px; font-weight: 600;">${area_atuacao}</p>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📍 Localização</p>
                          <p style="margin: 0; color: #d4af37; font-size: 15px; font-weight: 600;">${cidade}/${estado}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 16px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Ver Oportunidade no Painel
              </a>
            </td>
          </tr>

          <!-- TEXTO MOTIVACIONAL -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                Acesse seu painel para expressar interesse e iniciar uma negociação.<br>
                Oportunidades são atendidas por ordem de chegada.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Conectando o direito ao futuro.<br>
                <a href="https://socialjuridico.com.br" style="color: rgba(212, 175, 55, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.2); font-size: 11px; text-align: center;">
                Você recebeu este email porque é um advogado cadastrado na plataforma Social Jurídico.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template de notificação de interesse de advogado para o cliente
 */
export function interesseCasoTemplate({ titulo, lawyerName, clientName }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/cliente';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">⚖️ SOCIAL JURÍDICO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">ADVOGADO INTERESSADO NO SEU CASO</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${clientName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Ótima notícia! Um advogado demonstrou interesse em atender o seu caso na plataforma Social Jurídico.
              </p>
            </td>
          </tr>

          <!-- CARD DE INTERESSE -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                
                <!-- Título do caso -->
                <tr>
                  <td style="padding: 24px 24px 16px;">
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📋 Seu Caso</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; line-height: 1.4;">${titulo}</p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
                  </td>
                </tr>

                <!-- Advogado interessado -->
                <tr>
                  <td style="padding: 16px 24px 20px;">
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">👤 Advogado Interessado</p>
                    <p style="margin: 0; color: #d4af37; font-size: 16px; font-weight: 600;">${lawyerName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MENSAGEM -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.7; text-align: center;">
                Acesse seu painel para <strong style="color: #ffffff;">aceitar</strong> ou <strong style="color: #ffffff;">recusar</strong> esta manifestação de interesse e dar andamento ao seu caso.
              </p>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 16px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Acessar Meu Painel
              </a>
            </td>
          </tr>

          <!-- TEXTO INFORMATIVO -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                Você pode conversar com o advogado antes de tomar sua decisão.<br>
                Não perca tempo — advogados qualificados podem atender outros casos!
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Conectando o direito ao futuro.<br>
                <a href="https://socialjuridico.com.br" style="color: rgba(212, 175, 55, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.2); font-size: 11px; text-align: center;">
                Você recebeu este email porque possui um caso publicado na plataforma Social Jurídico.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template genérico de notificação para advogados.
 * Reutilizado para: aceite, recusa, contratação, cancelamento, mensagem.
 */
function notificacaoAdvogadoBase({ lawyerName, headerSubtitle, emoji, titulo, mensagem, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">⚖️ SOCIAL JURÍDICO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">${headerSubtitle}</p>
            </td>
          </tr>

          <!-- CONTEÚDO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; font-size: 28px; text-align: center;">${emoji}</p>
                    <p style="margin: 0 0 12px; color: #d4af37; font-size: 16px; font-weight: 700; text-align: center;">${titulo}</p>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7; text-align: center;">${mensagem}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                ${ctaText}
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Conectando o direito ao futuro.<br>
                <a href="https://socialjuridico.com.br" style="color: rgba(212, 175, 55, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES ESPECÍFICOS PARA ADVOGADOS (usam o base acima)
// ═══════════════════════════════════════════════════════════════

/** 1. Cliente ACEITOU a manifestação de interesse (iniciar negociação) */
export function interesseAceitoTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'SUA PROPOSTA FOI ACEITA',
    emoji: '🤝',
    titulo: 'Negociação Iniciada!',
    mensagem: `O cliente aceitou sua manifestação de interesse no caso <strong style="color: #ffffff;">"${casoTitulo}"</strong>. Vocês estão agora em fase de negociação. Acesse o painel para conversar com o cliente.`,
    ctaText: 'Acessar Negociação',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/** 2. Cliente RECUSOU a manifestação de interesse */
export function interesseRecusadoTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'ATUALIZAÇÃO DO SEU CASO',
    emoji: '📋',
    titulo: 'Proposta Não Aceita',
    mensagem: `O cliente decidiu não prosseguir com a negociação no caso <strong style="color: #ffffff;">"${casoTitulo}"</strong>. Não desanime — novas oportunidades aparecem todos os dias na plataforma!`,
    ctaText: 'Ver Novas Oportunidades',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/** 3. Cliente CONTRATOU o advogado */
export function advogadoContratadoTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'PARABÉNS — VOCÊ FOI CONTRATADO!',
    emoji: '🎉',
    titulo: 'Contratação Confirmada!',
    mensagem: `O cliente contratou seus serviços para o caso <strong style="color: #ffffff;">"${casoTitulo}"</strong>. O chat direto já está disponível para você iniciar o atendimento.`,
    ctaText: 'Iniciar Atendimento',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/** 4. Caso encerrado — advogado perdeu a vaga (outro foi contratado ou caso cancelado) */
export function casoEncerradoTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'ATUALIZAÇÃO DE CASO',
    emoji: '📌',
    titulo: 'Caso Encerrado',
    mensagem: `O caso <strong style="color: #ffffff;">"${casoTitulo}"</strong> foi encerrado pelo cliente. Continue buscando novas oportunidades na plataforma — novos casos são publicados diariamente!`,
    ctaText: 'Ver Novas Oportunidades',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/** 5. Nova mensagem no chat */
export function novaMensagemTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'NOVA MENSAGEM NO CHAT',
    emoji: '💬',
    titulo: 'Você recebeu uma mensagem!',
    mensagem: `O cliente enviou uma nova mensagem no caso <strong style="color: #ffffff;">"${casoTitulo}"</strong>. Acesse o chat para responder e manter a negociação ativa.`,
    ctaText: 'Responder no Chat',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/** 6. Caso cancelado/apagado pelo cliente (advogado tinha interesse) */
export function casoCanceladoTemplate({ lawyerName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'CASO CANCELADO',
    emoji: '🚫',
    titulo: 'Caso Cancelado pelo Cliente',
    mensagem: `O cliente cancelou o caso <strong style="color: #ffffff;">"${casoTitulo}"</strong> no qual você tinha interesse. Isso não afeta sua avaliação na plataforma. Fique atento a novas oportunidades!`,
    ctaText: 'Ver Novas Oportunidades',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE PARA CLIENTES
// ═══════════════════════════════════════════════════════════════

/** Nova mensagem do advogado para o cliente */
export function novaMensagemClienteTemplate({ clientName, casoTitulo, lawyerName }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/cliente';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">⚖️ SOCIAL JURÍDICO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">NOVA MENSAGEM NO SEU CASO</p>
            </td>
          </tr>

          <!-- CONTEÚDO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${clientName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                O advogado <strong style="color: #ffffff;">${lawyerName}</strong> enviou uma nova mensagem referente ao seu caso:
              </p>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; font-size: 28px; text-align: center;">💬</p>
                    <p style="margin: 0 0 12px; color: #d4af37; font-size: 16px; font-weight: 700; text-align: center;">${casoTitulo}</p>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7; text-align: center;">Acesse seu painel para ler e responder a mensagem.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Responder no Chat
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Conectando o direito ao futuro.<br>
                <a href="https://socialjuridico.com.br" style="color: rgba(212, 175, 55, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE PARA ADMINISTRADORES
// ═══════════════════════════════════════════════════════════════

/** Notificação de nova venda (Juris ou PRO) para admins */
export function novaVendaAdminTemplate({ adminName, tipoVenda, advogadoNome, advogadoEmail, valor, jurisAmount }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/admin/transacoes';
  const isPro = tipoVenda === 'PRO_SUBSCRIPTION';
  const emoji = isPro ? '👑' : '💰';
  const tipoLabel = isPro ? 'Plano PRO Mensal' : `Pacote de ${jurisAmount} Juris`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #27ae60 0%, #219a52 50%, #1a8744 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1px;">${emoji} NOVA VENDA!</h1>
              <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">SOCIAL JURÍDICO — PAINEL ADMIN</p>
            </td>
          </tr>

          <!-- CONTEÚDO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${adminName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Uma nova venda acaba de ser realizada na plataforma:
              </p>
            </td>
          </tr>

          <!-- CARD DA VENDA -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(39, 174, 96, 0.1) 0%, rgba(39, 174, 96, 0.03) 100%); border: 1px solid rgba(39, 174, 96, 0.3); border-radius: 12px; overflow: hidden;">
                
                <!-- Tipo + Valor -->
                <tr>
                  <td style="padding: 24px 24px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="60%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📦 Produto</p>
                          <p style="margin: 0; color: #27ae60; font-size: 16px; font-weight: 700;">${tipoLabel}</p>
                        </td>
                        <td width="40%" style="vertical-align: top; text-align: right;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">💵 Valor</p>
                          <p style="margin: 0; color: #27ae60; font-size: 20px; font-weight: 800;">R$ ${valor}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(39, 174, 96, 0.15);"></div>
                  </td>
                </tr>

                <!-- Advogado -->
                <tr>
                  <td style="padding: 16px 24px 20px;">
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">👤 Comprador</p>
                    <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${advogadoNome}</p>
                    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.5); font-size: 13px;">${advogadoEmail}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #219a52 100%); color: #ffffff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);">
                Ver Transações
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(39, 174, 96, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Painel Administrativo<br>
                <a href="https://socialjuridico.com.br/dashboard/admin" style="color: rgba(39, 174, 96, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE GENÉRICO DE COMUNICADO DO ADMIN
// ═══════════════════════════════════════════════════════════════

/** Comunicado genérico enviado pelo admin via painel */
export function comunicadoAdminTemplate({ recipientName, titulo, mensagem }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #08090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #0d0f14 0%, #12151c 100%); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; max-width: 600px;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">⚖️ SOCIAL JURÍDICO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">COMUNICADO OFICIAL</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${recipientName}</strong>!
              </p>
            </td>
          </tr>

          <!-- CARD DO COMUNICADO -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px;">
                    <h2 style="margin: 0 0 16px; color: #d4af37; font-size: 20px; font-weight: 700; line-height: 1.4;">${titulo}</h2>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8; white-space: pre-line;">${mensagem}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="https://socialjuridico.com.br" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Acessar Plataforma
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 12px; text-align: center; line-height: 1.6;">
                Social Jurídico — Conectando o direito ao futuro.<br>
                <a href="https://socialjuridico.com.br" style="color: rgba(212, 175, 55, 0.5); text-decoration: none;">socialjuridico.com.br</a>
              </p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.2); font-size: 11px; text-align: center;">
                Você recebeu este email porque é um usuário cadastrado na plataforma Social Jurídico.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
