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
export function interesseCasoTemplate({ titulo, clientName, interestedCount = 1, lawyerName = '', trackId = '' }) {
  const dashboardUrl = trackId 
    ? `https://socialjuridico.com.br/api/track/click?trackId=${trackId}`
    : 'https://socialjuridico.com.br/dashboard/cliente';

  const titleText = interestedCount > 1 
    ? '⚖️ Seu caso chamou atenção'
    : '⚖️ Seu caso recebeu interesse';

  const subtitleText = interestedCount > 1 
    ? `${interestedCount} ADVOGADOS INTERESSADOS`
    : 'ADVOGADO INTERESSADO NO SEU CASO';

  const bodyText = interestedCount > 1
    ? `<strong style="color: #d4af37;">${interestedCount} advogados</strong> demonstraram interesse em analisar sua situação.`
    : `Um advogado qualificado demonstrou interesse em analisar sua situação.`;

  // Render lawyer detail card or a generic summary
  let detailsHtml = '';
  if (interestedCount === 1 && lawyerName) {
    detailsHtml = `
      <!-- CARD DE INTERESSE (Único Advogado) -->
      <tr>
        <td style="padding: 8px 40px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 20px 24px 12px;">
                <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📋 Seu Caso</p>
                <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; line-height: 1.4;">${titulo}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px;">
                <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 24px 20px;">
                <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">👤 Advogado Interessado</p>
                <p style="margin: 0; color: #d4af37; font-size: 16px; font-weight: 600;">${lawyerName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  } else {
    detailsHtml = `
      <!-- CARD DE INTERESSE (Múltiplos Advogados) -->
      <tr>
        <td style="padding: 8px 40px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 20px 24px 20px;">
                <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">📋 Seu Caso</p>
                <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; line-height: 1.4;">${titulo}</p>
              </td>
            </tr>
            ${lawyerName ? `
            <tr>
              <td style="padding: 0 24px;">
                <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 24px 20px;">
                <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">👤 Advogados Interessados</p>
                <p style="margin: 0; color: #d4af37; font-size: 14px; font-weight: 600; line-height: 1.4;">${lawyerName}</p>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    `;
  }

  const trackingPixelHtml = trackId
    ? `<img src="https://socialjuridico.com.br/api/track/open?trackId=${trackId}" width="1" height="1" alt="" style="display:none;" />`
    : '';

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
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">${subtitleText}</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${clientName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.7; font-weight: 600;">
                ${titleText}.
              </p>
              <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                ${bodyText}
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Agora você pode comparar perfis e escolher quem melhor atende você. Não deixe sua solicitação parada.
              </p>
            </td>
          </tr>

          <!-- CARD DE INTERESSE -->
          ${detailsHtml}

          <!-- PROVA SOCIAL -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(212, 175, 55, 0.04); border: 1px dashed rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">VANTAGENS DO ATENDIMENTO:</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="24" valign="top" style="color: #d4af37; font-size: 16px; line-height: 20px; font-weight: bold;">✔</td>
                        <td style="color: rgba(255, 255, 255, 0.85); font-size: 14px; line-height: 20px; padding-bottom: 8px;"><strong>Especialistas na área:</strong> Advogados com experiência no tipo do seu caso.</td>
                      </tr>
                      <tr>
                        <td width="24" valign="top" style="color: #d4af37; font-size: 16px; line-height: 20px; font-weight: bold;">✔</td>
                        <td style="color: rgba(255, 255, 255, 0.85); font-size: 14px; line-height: 20px; padding-bottom: 8px;"><strong>Atendimento online:</strong> Esclareça dúvidas e envie documentos sem sair de casa.</td>
                      </tr>
                      <tr>
                        <td width="24" valign="top" style="color: #d4af37; font-size: 16px; line-height: 20px; font-weight: bold;">✔</td>
                        <td style="color: rgba(255, 255, 255, 0.85); font-size: 14px; line-height: 20px;"><strong>Profissionais verificados:</strong> Todos possuem cadastro ativo e regular na OAB.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ESCASSEZ / TEXTO INFORMATIVO -->
          <tr>
            <td style="padding: 0 40px 16px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600; line-height: 1.6;">
                ⏳ Seu caso já recebeu interesse.
              </p>
              <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.65); font-size: 13.5px; line-height: 1.6;">
                Quanto antes você responder, mais rápido poderá iniciar seu atendimento jurídico.
              </p>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 24px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Ver Advogados Interessados
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
                Você recebeu este email porque possui um caso publicado na plataforma Social Jurídico.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  ${trackingPixelHtml}
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

/**
 * Template de notificação LOCAL de novo caso para advogados no mesmo ESTADO
 */
export function oportunidadeLocalTemplate({ titulo, area_atuacao, cidade, estado, lawyerName }) {
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
          
          <!-- HEADER LOCAL -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0d0f12; font-size: 22px; font-weight: 800; letter-spacing: 1px;">📍 OPORTUNIDADE NA SUA REGIÃO</h1>
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">SOCIAL JURÍDICO</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Temos uma grande novidade pertinho de você! Um cliente no estado de <strong style="color: #d4af37;">${estado}</strong> publicou um novo caso e acreditamos que é a oportunidade perfeita para o seu escritório.
              </p>
            </td>
          </tr>

          <!-- CARD DO CASO -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px 24px 16px;">
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Título do Caso</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; line-height: 1.4;">${titulo}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
                  </td>
                </tr>
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
                          <p style="margin: 0; color: #d4af37; font-size: 15px; font-weight: 600;">${cidade} / ${estado}</p>
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
                Garantir Oportunidade
              </a>
            </td>
          </tr>

          <!-- TEXTO MOTIVACIONAL -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                Casos próximos a você tendem a fechar contrato muito mais rápido.<br>
                Demonstre interesse agora mesmo antes que outro colega assuma!
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
 * Template de confirmação de creditamento de Juris
 */
export function jurisCreditadoTemplate({ lawyerName, amount, balance }) {
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
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">JURIS CREDITADOS COM SUCESSO</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Confirmamos que o seu pacote de Juris foi creditado com sucesso na sua conta!
              </p>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 32px;">💰</p>
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Juris Adicionados</p>
                    <p style="margin: 0 0 16px; color: #d4af37; font-size: 24px; font-weight: 800;">+ ${amount} Juris</p>
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15); margin: 0 40px 16px;"></div>
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Seu Saldo Atual</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">${balance} Juris</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="https://socialjuridico.com.br/dashboard/advogado" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Ir para o Painel
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

/**
 * Template de boas-vindas para novos planos (Start/Pro)
 */
export function boasVindasPlanoTemplate({ lawyerName, planType, jurisBonus }) {
  const isPro = planType === 'PRO';
  const planLabel = isPro ? 'Plano PRO' : 'Plano Start';
  
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
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">BEM-VINDO AO SEU NOVO PLANO</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Parabéns! Você acaba de assinar o <strong style="color: #d4af37;">${planLabel}</strong>. Agora seu escritório está em outro nível!
              </p>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; font-size: 32px; text-align: center;">👑</p>
                    <p style="margin: 0 0 12px; color: #d4af37; font-size: 18px; font-weight: 700; text-align: center;">Seu Bônus Exclusivo</p>
                    <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.85); font-size: 15px; text-align: center;">
                      Você acabou de receber <strong style="color: #d4af37;">${jurisBonus} Juris</strong> de bônus para usar na plataforma!
                    </p>
                    
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15); margin: 0 0 16px;"></div>
                    
                    <p style="margin: 0 0 12px; color: #d4af37; font-size: 16px; font-weight: 700;">Funcionalidades do seu Plano:</p>
                    <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); font-size: 14px; line-height: 1.8;">
                      <li>Acesso a casos exclusivos na sua região.</li>
                      <li>Notificações em tempo real via WhatsApp/E-mail.</li>
                      <li>Painel de gestão de clientes integrado.</li>
                      ${isPro ? `
                      <li><strong>Suporte prioritário</strong> via WhatsApp.</li>
                      <li><strong>Maior visibilidade</strong> no ranking de advogados.</li>
                      <li><strong>Créditos mensais maiores</strong> para manifestar interesse.</li>
                      ` : `
                      <li>Acesso básico ao painel de oportunidades.</li>
                      <li>Rastreamento de leitura de documentos.</li>
                      `}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="https://socialjuridico.com.br/dashboard/advogado" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Acessar Meu Painel
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

/**
 * 10. Template de notificação de novo cliente cadastrado no CRM
 */
export function clienteCadastradoCrmTemplate({ lawyerName, clientName, casoTitulo }) {
  return notificacaoAdvogadoBase({
    lawyerName,
    headerSubtitle: 'CLIENTE ADICIONADO AO CRM',
    emoji: '👤',
    titulo: 'Novo Cliente no seu CRM!',
    mensagem: `O cliente <strong style="color: #ffffff;">"${clientName}"</strong> foi cadastrado automaticamente no seu CRM após contratar os seus serviços no caso <strong style="color: #ffffff;">"${casoTitulo}"</strong>.`,
    ctaText: 'Acessar CRM',
    ctaUrl: 'https://socialjuridico.com.br/dashboard/advogado',
  });
}

/**
 * Template de notificação de novo caso do Radar Jurídico para advogados
 */
export function radarCasoTemplate({ titulo, categoria, cidade, estado, score_intencao, lawyerName }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/advogado';
  
  const localizacao = (cidade && estado)
    ? `${cidade}/${estado}`
    : (cidade || estado || "Não especificada");

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
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">NOVO CASO DETECTADO NO RADAR</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                O Radar Jurídico detectou um novo caso público na internet com alta intenção de contratação:
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
                    <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Descrição do Caso</p>
                    <p style="margin: 0; color: #ffffff; font-size: 17px; font-weight: 700; line-height: 1.4;">${titulo}</p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
                  </td>
                </tr>

                <!-- Área + Localização + Score -->
                <tr>
                  <td style="padding: 16px 24px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="38%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">📋 Categoria</p>
                          <p style="margin: 0; color: #d4af37; font-size: 14px; font-weight: 600;">${categoria || 'Geral'}</p>
                        </td>
                        <td width="38%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">📍 Localização</p>
                          <p style="margin: 0; color: #d4af37; font-size: 14px; font-weight: 600;">${localizacao}</p>
                        </td>
                        <td width="24%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">🎯 Intenção</p>
                          <p style="margin: 0; color: #10b981; font-size: 14px; font-weight: 800;">${score_intencao}%</p>
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
                Ver Oportunidades no Radar
              </a>
            </td>
          </tr>

          <!-- TEXTO MOTIVACIONAL -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                Esta oportunidade foi localizada e classificada automaticamente por nossa inteligência artificial.<br>
                Acesse o painel do Radar Jurídico para conferir os detalhes e garantir o caso.
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
 * Template de notificação de lote de casos do Radar Jurídico para advogados
 */
export function radarLoteCasosTemplate({ oportunidades, lawyerName }) {
  const dashboardUrl = 'https://socialjuridico.com.br/dashboard/advogado';

  // Build the list of cases as HTML
  const itemsHtml = oportunidades.map((op, index) => {
    const localizacao = (op.cidade && op.estado)
      ? `${op.cidade}/${op.estado}`
      : (op.cidade || op.estado || "Não especificada");

    return `
      <!-- ITEM CASO ${index + 1} -->
      <tr>
        <td style="padding: 24px 24px;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">Oportunidade #${index + 1}</p>
          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; line-height: 1.4;">${op.titulo}</p>
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 14px;">
            <tr>
              <td width="40%" style="vertical-align: top;">
                <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">📋 Categoria</span>
                <span style="color: #d4af37; font-size: 13px; font-weight: 600;">${op.categoria || 'Geral'}</span>
              </td>
              <td width="40%" style="vertical-align: top;">
                <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">📍 Localização</span>
                <span style="color: #d4af37; font-size: 13px; font-weight: 600;">${localizacao}</span>
              </td>
              <td width="20%" style="vertical-align: top;">
                <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">🎯 Intenção</span>
                <span style="color: #10b981; font-size: 13px; font-weight: 800;">${op.score_intencao}%</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Divider -->
      ${index < oportunidades.length - 1 ? `
      <tr>
        <td style="padding: 0 24px;">
          <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
        </td>
      </tr>
      ` : ''}
    `;
  }).join('');

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
              <p style="margin: 6px 0 0; color: rgba(13, 15, 18, 0.7); font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">NOVOS CASOS DETECTADOS NO RADAR</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                O Radar Jurídico selecionou <strong>${oportunidades.length} novos casos públicos</strong> com alta intenção de contratação para você:
              </p>
            </td>
          </tr>

          <!-- CONTAINER DOS CASOS -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 16px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Acessar Oportunidades no Radar
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
 * Template de notificação para movimentações processuais ou citações OAB
 */
export function monitoramentoProcessualTemplate({ lawyerName, tipoEvento, numeroCnj, detalhes, dataEvento, oabInfo }) {
  const dashboardUrl = "https://socialjuridico.com.br/dashboard/advogado/monitoramento";
  
  let headerTitle = "⚖️ EVENTO DE MONITORAMENTO";
  let subtitleText = "ATUALIZAÇÃO PROCESSUAL DETECTADA";
  let colorTheme = "#d4af37"; // gold
  let colorGradient = "linear-gradient(135deg, #d4af37 0%, #b8962e 50%, #a07928 100%)";
  let emoji = "🔔";

  if (tipoEvento === "oab_citation" || tipoEvento === "oab") {
    headerTitle = "⚖️ NOVA CITAÇÃO DETECTADA";
    subtitleText = "MONITORAMENTO DE DIÁRIO OFICIAL";
    emoji = "⚖️";
  } else if (tipoEvento === "process_movement" || tipoEvento === "cnj") {
    headerTitle = "🔔 NOVA MOVIMENTAÇÃO DETECTADA";
    subtitleText = "MONITORAMENTO DE CNJ INDIVIDUAL";
    emoji = "📈";
  } else if (tipoEvento === "monitoring_failed") {
    headerTitle = "⚠️ ALERTA DE MONITORAMENTO";
    subtitleText = "FALHA DE ATUALIZAÇÃO NO PROCESSO";
    colorTheme = "#e74c3c"; // red/orange
    colorGradient = "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
    emoji = "⚠️";
  }

  // Format date nicely if possible
  let dateFormatted = dataEvento;
  try {
    if (dataEvento) {
      const d = new Date(dataEvento);
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }
  } catch (e) {}

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
            <td style="background: ${colorGradient}; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: ${tipoEvento === "monitoring_failed" ? "#ffffff" : "#0d0f12"}; font-size: 20px; font-weight: 800; letter-spacing: 1px;">${headerTitle}</h1>
              <p style="margin: 6px 0 0; color: ${tipoEvento === "monitoring_failed" ? "rgba(255,255,255,0.8)" : "rgba(13, 15, 18, 0.7)"}; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">${subtitleText}</p>
            </td>
          </tr>

          <!-- SAUDAÇÃO -->
          <tr>
            <td style="padding: 36px 40px 16px;">
              <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6;">
                Olá, Dr(a). <strong style="color: #d4af37;">${lawyerName}</strong>!
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.75); font-size: 15px; line-height: 1.7;">
                Identificamos uma nova atualização no seu painel de monitoramento processual:
              </p>
            </td>
          </tr>

          <!-- CARD DE DETALHES -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; overflow: hidden;">
                
                <!-- Info Grid -->
                <tr>
                  <td style="padding: 24px 24px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${numeroCnj ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">🔢 Processo (CNJ)</p>
                          <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 700;">${numeroCnj}</p>
                        </td>
                      </tr>
                      ` : ""}
                      
                      ${oabInfo ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">⚖️ OAB Monitorada</p>
                          <p style="margin: 0; color: #d4af37; font-size: 15px; font-weight: 700;">${oabInfo}</p>
                        </td>
                      </tr>
                      ` : ""}

                      ${dateFormatted ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 2px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📅 Data do Evento</p>
                          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 14px;">${dateFormatted}</p>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="border-top: 1px solid rgba(212, 175, 55, 0.15);"></div>
                  </td>
                </tr>

                <!-- Detalhes do Evento -->
                <tr>
                  <td style="padding: 16px 24px 24px;">
                    <p style="margin: 0 0 6px; color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📝 Conteúdo / Descrição</p>
                    <div style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14.5px; line-height: 1.6; white-space: pre-line; background-color: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border-left: 3px solid ${colorTheme};">
                      ${detalhes || "Nenhum detalhe adicional fornecido."}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÃO CTA -->
          <tr>
            <td style="padding: 8px 40px 16px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #0d0f12; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Ver Monitoramento no Painel
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
                Este é um e-mail automático enviado pelo seu assistente de monitoramento do Social Jurídico.
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



