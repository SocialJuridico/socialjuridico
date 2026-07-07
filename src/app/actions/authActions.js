"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { formatStoredOAB, normalizeOAB, normalizeUF } from "@/lib/oab";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.socialjuridico.com.br";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

const RESEND_COOLDOWN_MS = 60 * 1000;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createConfirmationEmailHtml({ name, role, verifyLink }) {
  const safeName = escapeHtml(name || "usuário");

  const lawyerInstructions =
    role === "LAWYER"
      ? `
        <div
          style="
            margin: 24px 0;
            padding: 20px;
            border: 1px solid #d4af37;
            border-radius: 10px;
            background: #29251a;
          "
        >
          <p
            style="
              margin: 0 0 12px;
              color: #d4af37;
              font-weight: bold;
            "
          >
            Verificação profissional automática
          </p>

          <p style="font-size:14px;line-height:1.6;">
            Ao confirmar seu e-mail, você será direcionado direto para a
            verificação da sua identidade e da sua OAB. Tenha em mãos sua
            CNA (física ou digital) e leva menos de 2 minutos.
          </p>

          <p style="font-size:14px;line-height:1.6;color:#a8a8a8;">
            Caso a verificação automática não seja concluída, nossa equipe
            fará a análise manualmente e você será notificado por e-mail.
          </p>
        </div>
      `
      : "";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Confirme sua conta</title>
      </head>

      <body
        style="
          margin:0;
          padding:24px;
          background:#111111;
          font-family:Arial,sans-serif;
          color:#ffffff;
        "
      >
        <div
          style="
            max-width:620px;
            margin:0 auto;
            overflow:hidden;
            border:1px solid #d4af37;
            border-radius:14px;
            background:#0d0f12;
          "
        >
          <div style="padding:34px 36px;">
            <h1
              style="
                margin:0 0 24px;
                color:#d4af37;
                text-align:center;
                font-size:28px;
              "
            >
              Bem-vindo ao Social Jurídico
            </h1>

            <p style="font-size:16px;line-height:1.65;">
              Olá, <strong>${safeName}</strong>.
            </p>

            <p style="font-size:16px;line-height:1.65;">
              Confirme seu endereço de e-mail para ativar sua conta
              e acessar a plataforma.
            </p>

            ${lawyerInstructions}

            <div style="margin:32px 0;text-align:center;">
              <a
                href="${verifyLink}"
                style="
                  display:inline-block;
                  padding:14px 28px;
                  border-radius:8px;
                  color:#111111;
                  background:#d4af37;
                  text-decoration:none;
                  font-size:16px;
                  font-weight:bold;
                "
              >
                Confirmar minha conta
              </a>
            </div>

            <p
              style="
                margin:0;
                color:#a8a8a8;
                font-size:13px;
                line-height:1.55;
                text-align:center;
              "
            >
              O link possui validade limitada. Caso você não tenha
              solicitado este cadastro, ignore esta mensagem.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendConfirmationEmail({ email, name, role }) {
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${SITE_URL}/login`,
      },
    });

  if (linkError) {
    throw linkError;
  }

  const hashedToken = linkData?.properties?.hashed_token;

  if (!hashedToken) {
    throw new Error("Não foi possível gerar o token de confirmação.");
  }

  // Aponta para uma página intermediária (não para a rota que confirma
  // direto) porque scanners de segurança de e-mail (Gmail, Outlook/M365,
  // antivírus corporativo) costumam pré-visitar links de e-mail via GET
  // antes do usuário clicar, consumindo o token de uso único. A página
  // intermediária só dispara a confirmação real após um clique explícito.
  const verifyUrl = new URL("/confirmar-email/processar", SITE_URL);

  verifyUrl.searchParams.set("token_hash", hashedToken);
  verifyUrl.searchParams.set("type", "signup");

  const { error: resendError } = await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Bem-vindo ao Social Jurídico — confirme sua conta",
    html: createConfirmationEmailHtml({
      name,
      role,
      verifyLink: verifyUrl.toString(),
    }),
  });

  if (resendError) {
    throw new Error(
      resendError.message || "Erro ao enviar o e-mail de confirmação.",
    );
  }
}

export async function signUpAction(formData) {
  const {
    email,
    password,
    name,
    phone,
    role,
    oab,
    estado,
    origem_descoberta,
    referral_code,
  } = formData;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const normalizedUf = normalizeUF(estado);
    const normalizedOab =
      role === "LAWYER" ? normalizeOAB(oab, normalizedUf) : "";

    if (role === "LAWYER") {
      if (!normalizedUf || !normalizedOab) {
        throw new Error(
          "Informe uma UF válida e apenas números no campo da OAB.",
        );
      }

      const { data: existingLawyers, error: oabCheckError } =
        await supabaseAdmin.from("advogados").select("id, oab, estado");

      if (oabCheckError) throw oabCheckError;

      const duplicateOab = (existingLawyers || []).find((lawyer) => {
        const storedOab = formatStoredOAB(lawyer.oab, lawyer.estado);
        return storedOab && storedOab === normalizedOab;
      });

      if (duplicateOab) {
        throw new Error(
          `Já existe um advogado cadastrado com a OAB ${normalizedOab}.`,
        );
      }
    }

    // 1. Criar o usuário no Auth (sem confirmar automaticamente para permitir a geração do link)
    let user;
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false, // DEVE ser false para o generateLink('signup') funcionar e o email disparar
        user_metadata: {
          full_name: name,
          role: role,
        },
      });

    if (authError) {
      if (
        authError.message.includes("already be registered") ||
        authError.status === 422
      ) {
        return {
          success: false,
          message:
            "Este e-mail já está cadastrado em nossa plataforma. Se você esqueceu sua senha, use a opção 'Esqueci minha senha' ou entre em contato com o suporte.",
          code: "USER_ALREADY_EXISTS",
        };
      }
      throw authError;
    } else {
      user = authData.user;
    }

    if (!user) throw new Error("Erro ao identificar usuário.");

    // 2. Verificar se já existe um perfil com esse email (órfão)
    const table = role === "LAWYER" ? "advogados" : "clientes";
    const { data: existingProfile } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile) {
      console.log(
        `Perfil órfão encontrado para ${email}. Vinculando ao novo Auth ID: ${user.id}`,
      );
      // Atualizar o ID do perfil antigo para o novo ID do Auth
      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({ id: user.id })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Erro ao vincular perfil órfão:", updateError);
        throw new Error(
          "Erro ao vincular seu perfil existente. Contate o suporte.",
        );
      }
    } else {
      // Inserir novo perfil se não existir
      const insertData = {
        id: user.id,
        email: normalizedEmail,
        name: name,
        phone: phone,
        role: role,
        origem_descoberta: origem_descoberta || "Não informado",
        created_at: new Date().toISOString(),
      };

      if (role === "LAWYER") {
        insertData.oab = normalizedOab;
        insertData.estado = normalizedUf;
      }

      const { error: dbError } = await supabaseAdmin
        .from(table)
        .insert([insertData]);

      if (dbError) {
        console.error(`Erro ao inserir na tabela ${table}:`, dbError);
        throw new Error(
          `Usuário criado, mas erro ao salvar perfil: ${dbError.message}`,
        );
      }
    }

    // 2.1 Registrar indicação (Referral)
    if (referral_code) {
      try {
        // Verificar se o indicador existe e pegar o nome dele (apenas para log interno ou validação)
        const { data: referrer, error: refError } = await supabaseAdmin
          .from("advogados")
          .select("name")
          .eq("id", referral_code)
          .single();

        if (referrer) {
          console.log(
            `Usuário ${name} indicado por ${referrer.name} (${referral_code})`,
          );

          // Inserir registro na tabela de indicações para transparência
          await supabaseAdmin.from("indicacoes").insert([
            {
              indicador_id: referral_code,
              nome_indicado: name,
              email_indicado: normalizedEmail,
              status: "CADASTRADO",
            },
          ]);

          // Atualizar o 'indicado_por' no perfil recém criado (para histórico no perfil)
          await supabaseAdmin
            .from(table)
            .update({ indicado_por: referral_code })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error("Erro silencioso ao registrar indicação:", err);
        // Não interrompemos o cadastro principal se a indicação falhar
      }
    }

    // 3. Enviar o e-mail de confirmação pelo Resend
    try {
      await sendConfirmationEmail({
        email: normalizedEmail,
        name,
        role,
      });
    } catch (emailError) {
      console.error("[Cadastro] Falha ao enviar confirmação:", emailError);

      // A conta continua criada para permitir o reenvio.
    }

    return {
      success: true,
      message:
        "Conta criada! Verifique sua caixa de entrada para confirmar seu e-mail antes de fazer login.",
    };
  } catch (error) {
    console.error("Erro no signUpAction:", error);

    return {
      success: false,
      message: error?.message || "Erro inesperado ao cadastrar.",
    };
  }
}

export async function resendConfirmationAction(email) {
  const genericResponse = {
    success: true,
    message:
      "Se existir uma conta pendente para este e-mail, enviaremos um novo link de confirmação.",
  };

  try {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return {
        success: false,
        message: "Informe um endereço de e-mail válido.",
      };
    }

    let profile = null;
    let role = null;

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lawyerError) {
      console.error("[Reenvio] Erro ao consultar advogado:", lawyerError);
    }

    if (lawyer) {
      profile = lawyer;
      role = "LAWYER";
    }

    if (!profile) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from("clientes")
        .select("id, name, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (clientError) {
        console.error("[Reenvio] Erro ao consultar cliente:", clientError);
      }

      if (client) {
        profile = client;
        role = "CLIENT";
      }
    }

    if (!profile) {
      const { data: oraculo, error: oraculoError } = await supabaseAdmin
        .from("oraculo_profissionais")
        .select("auth_user_id, name, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (oraculoError) {
        console.error(
          "[Reenvio] Erro ao consultar oraculo_profissionais:",
          oraculoError,
        );
      }

      if (oraculo?.auth_user_id) {
        profile = { id: oraculo.auth_user_id, name: oraculo.name };
        role = "ORACULO";
      }
    }

    // Não revela se o endereço existe.
    if (!profile?.id) {
      return genericResponse;
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user) {
      console.warn("[Reenvio] Usuário Auth não encontrado:", normalizedEmail);

      return genericResponse;
    }

    const user = userData.user;

    // Não revela que a conta já está confirmada.
    if (user.email_confirmed_at) {
      return genericResponse;
    }

    const lastSentAt = user.user_metadata?.confirmation_email_last_sent_at;

    if (lastSentAt) {
      const elapsed = Date.now() - new Date(lastSentAt).getTime();

      if (Number.isFinite(elapsed) && elapsed < RESEND_COOLDOWN_MS) {
        return {
          success: false,
          code: "RESEND_COOLDOWN",
          message: "Aguarde um minuto antes de solicitar outro e-mail.",
        };
      }
    }

    await sendConfirmationEmail({
      email: normalizedEmail,
      name: profile.name || user.user_metadata?.full_name || "usuário",
      role,
    });

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        confirmation_email_last_sent_at: new Date().toISOString(),
      },
    });

    return genericResponse;
  } catch (error) {
    console.error("[Reenvio] Erro inesperado:", error);

    return {
      success: false,
      message:
        "Não foi possível reenviar agora. Aguarde alguns minutos e tente novamente.",
    };
  }
}

/**
 * Solicitação de recuperação de senha via Resend.
 *
 * A resposta é sempre genérica para não revelar se o e-mail
 * possui ou não uma conta cadastrada.
 */
export async function forgotPasswordAction(email) {
  const genericResponse = {
    success: true,
    message:
      "Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve.",
  };

  try {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !normalizedEmail ||
      normalizedEmail.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return {
        success: false,
        message: "Informe um endereço de e-mail válido.",
      };
    }

    const redirectUrl = new URL("/atualizar-senha", SITE_URL);

    redirectUrl.searchParams.set("type", "recovery");

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });

    if (linkError) {
      console.warn(
        "[Recuperação de senha] Não foi possível gerar o link:",
        linkError.message,
      );

      return genericResponse;
    }

    const recoveryLink = linkData?.properties?.action_link;

    if (!recoveryLink) {
      console.warn("[Recuperação de senha] Link não retornado pelo Supabase.");

      return genericResponse;
    }

    const { error: resendError } = await resend.emails.send({
      from: RESEND_FROM,
      to: normalizedEmail,
      subject: "Redefinição de senha — Social Jurídico",
      html: `
          <!doctype html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <meta
                name="viewport"
                content="width=device-width"
              />
              <title>Redefinição de senha</title>
            </head>

            <body
              style="
                margin: 0;
                padding: 24px;
                background: #111111;
                color: #ffffff;
                font-family: Arial, sans-serif;
              "
            >
              <div
                style="
                  max-width: 620px;
                  margin: 0 auto;
                  overflow: hidden;
                  border: 1px solid rgba(212, 175, 55, 0.35);
                  border-radius: 14px;
                  background: #0d0f12;
                "
              >
                <div style="padding: 34px 36px;">
                  <p
                    style="
                      margin: 0 0 10px;
                      color: #d4af37;
                      font-size: 12px;
                      font-weight: 700;
                      letter-spacing: 0.08em;
                      text-align: center;
                      text-transform: uppercase;
                    "
                  >
                    Social Jurídico
                  </p>

                  <h1
                    style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 27px;
                      line-height: 1.25;
                      text-align: center;
                    "
                  >
                    Redefinição de senha
                  </h1>

                  <p
                    style="
                      margin: 25px 0 0;
                      color: #d7d7d7;
                      font-size: 16px;
                      line-height: 1.65;
                    "
                  >
                    Recebemos uma solicitação para redefinir
                    a senha da sua conta no Social Jurídico.
                  </p>

                  <p
                    style="
                      margin: 14px 0 0;
                      color: #d7d7d7;
                      font-size: 16px;
                      line-height: 1.65;
                    "
                  >
                    Clique no botão abaixo para criar uma nova
                    senha.
                  </p>

                  <div
                    style="
                      margin: 32px 0;
                      text-align: center;
                    "
                  >
                    <a
                      href="${recoveryLink}"
                      style="
                        display: inline-block;
                        padding: 14px 27px;
                        border-radius: 8px;
                        color: #111111;
                        background: #d4af37;
                        font-size: 16px;
                        font-weight: 700;
                        text-decoration: none;
                      "
                    >
                      Redefinir minha senha
                    </a>
                  </div>

                  <div
                    style="
                      padding: 16px;
                      border: 1px solid rgba(255, 255, 255, 0.08);
                      border-radius: 10px;
                      background: rgba(255, 255, 255, 0.025);
                    "
                  >
                    <p
                      style="
                        margin: 0;
                        color: #a8a8a8;
                        font-size: 13px;
                        line-height: 1.6;
                      "
                    >
                      O link possui validade limitada. Caso você
                      não tenha solicitado a redefinição, ignore
                      esta mensagem. Sua senha atual permanecerá
                      inalterada.
                    </p>
                  </div>

                  <p
                    style="
                      margin: 26px 0 0;
                      color: #737373;
                      font-size: 12px;
                      line-height: 1.5;
                      text-align: center;
                    "
                  >
                    Esta é uma mensagem automática do
                    Social Jurídico.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
    });

    if (resendError) {
      console.error("[Recuperação de senha] Erro no Resend:", resendError);

      return {
        success: false,
        message:
          "Não foi possível enviar o e-mail agora. Aguarde alguns minutos e tente novamente.",
      };
    }

    return genericResponse;
  } catch (error) {
    console.error("[Recuperação de senha] Erro inesperado:", error);

    return {
      success: false,
      message: "Não foi possível processar sua solicitação agora.",
    };
  }
}

export async function signInAction(email, password) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;

    // Tenta pegar o metadado diretamente das identidades ou da sessão
    const needsUpdate =
      data.user?.user_metadata?.needs_password_update === true;

    console.log("DEBUG LOGIN:", {
      email: data.user?.email,
      metadata: data.user?.user_metadata,
      needsUpdate,
    });

    return {
      success: true,
      user: data.user,
      needsPasswordUpdate: needsUpdate,
    };
  } catch (error) {
    console.error("Erro no signInAction:", error);
    return {
      success: false,
      message: error.message || "Credenciais inválidas.",
    };
  }
}

export async function updatePasswordAction(newPassword) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { needs_password_update: false }, // Remove o marcador após sucesso
    });

    if (error) throw error;

    return { success: true, message: "Senha atualizada com sucesso!" };
  } catch (error) {
    console.error("Erro no updatePasswordAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao atualizar senha.",
    };
  }
}

export async function getAdvogadosAction() {
  try {
    const supabase = createClient();
    const { data, error } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, avatar, oab, estado, avg_rating, verified, specialties",
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro Supabase:", error);
      throw error;
    }

    console.log("Advogados recuperados do banco:", data?.length || 0);
    return {
      success: true,
      data: (data || []).map((lawyer) => ({
        ...lawyer,
        oab: formatStoredOAB(lawyer.oab, lawyer.estado),
      })),
    };
  } catch (error) {
    console.error("Erro no getAdvogadosAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao buscar advogados.",
    };
  }
}

export async function createCasoAction(casoData) {
  try {
    const { titulo, descricao, area_atuacao, cliente_id, anexos } = casoData;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("casos")
      .insert([
        {
          titulo,
          descricao,
          area_atuacao,
          cliente_id,
          anexos, // Array de URLs do Supabase Storage
          status: "ABERTO",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Erro no createCasoAction:", error);
    return { success: false, message: error.message || "Erro ao criar caso." };
  }
}

export async function updateCasoAction(casoId, updateData) {
  try {
    const { titulo, descricao, area_atuacao } = updateData;

    console.log("Iniciando updateCasoAction para ID:", casoId);
    console.log("Dados de atualização:", { titulo, descricao, area_atuacao });

    const { data, error } = await supabaseAdmin
      .from("casos")
      .update({
        titulo,
        descricao,
        area_atuacao,
        updated_at: new Date().toISOString(),
      })
      .eq("id", casoId)
      .select();

    if (error) {
      console.error("Erro no Supabase ao atualizar caso:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn(
        "Nenhum caso foi atualizado (ID não encontrado ou sem permissão).",
      );
      return {
        success: false,
        message: "Não foi possível encontrar o caso para atualizar.",
      };
    }

    console.log("Caso atualizado com sucesso:", data[0].id);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Erro no updateCasoAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao atualizar caso.",
    };
  }
}

export async function getNotificacoesAction(userId) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Erro no getNotificacoesAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao buscar notificações.",
    };
  }
}

export async function getClientProfileAction(userId) {
  try {
    const supabase = createClient();
    const clientToUse = supabaseAdmin || supabase;

    // 1. Tenta em Clientes
    let { data, error } = await clientToUse
      .from("clientes")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error) return { success: true, data };

    // 2. Tenta em Advogados
    console.warn("Não achou em clientes, tentando advogados...");
    const { data: advData, error: advError } = await clientToUse
      .from("advogados")
      .select("*")
      .eq("id", userId)
      .single();

    if (!advError) return { success: true, data: advData };

    // 3. Tenta em Admins
    console.warn("Não achou em advogados, tentando admins...");
    const { data: adminData, error: adminError } = await clientToUse
      .from("admins")
      .select("*")
      .eq("id", userId)
      .single();

    if (!adminError) return { success: true, data: adminData };

    // Se chegou aqui, não achou em lugar nenhum
    throw new Error(
      "Perfil não encontrado em nenhuma categoria (Cliente, Advogado ou Admin).",
    );
  } catch (error) {
    console.error("Erro no getClientProfileAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao buscar perfil.",
    };
  }
}

export async function updateClientProfileAction(userId, updateData) {
  try {
    const { name, phone } = updateData;
    const supabase = createClient();

    // 1. Atualizar na tabela clientes
    const { error: dbError } = await supabase
      .from("clientes")
      .update({ name, phone })
      .eq("id", userId);

    if (dbError) throw dbError;

    // 2. Opcional: Atualizar no Auth (full_name)
    await supabase.auth.updateUser({
      data: { full_name: name },
    });

    return { success: true, message: "Perfil atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro no updateClientProfileAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao atualizar perfil.",
    };
  }
}

export async function deleteAccountAction(userId) {
  try {
    const supabase = createClient();
    // 1. Deletar da tabela clientes
    const { error: dbError } = await supabase
      .from("clientes")
      .delete()
      .eq("id", userId);

    if (dbError) throw dbError;

    // 2. Deletar do Auth (Requer supabaseAdmin / Service Role)
    if (!supabaseAdmin) {
      throw new Error("Permissão de administrador não configurada.");
    }

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return { success: true, message: "Conta excluída com sucesso." };
  } catch (error) {
    console.error("Erro no deleteAccountAction:", error);
    return {
      success: false,
      message: error.message || "Erro ao excluir conta.",
    };
  }
}

export async function confirmEmailAction({ token_hash, type }) {
  try {
    const supabase = createClient();

    if (!token_hash || !type) {
      throw new Error("Parâmetros inválidos para confirmação.");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) throw error;

    return {
      success: true,
      message: "E-mail confirmado com sucesso!",
    };
  } catch (error) {
    console.error("Erro no confirmEmailAction:", error);
    return {
      success: false,
      message: error.message || "Não foi possível confirmar o e-mail.",
    };
  }
}
