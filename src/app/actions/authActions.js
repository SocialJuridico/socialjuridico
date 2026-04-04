"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { formatStoredOAB, normalizeOAB, normalizeUF } from "@/lib/oab";

export async function signUpAction(formData) {
  const { email, password, name, phone, role, oab, estado, origem_descoberta } =
    formData;
  const supabase = createClient();
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

    // 1. Criar o usuário no Auth (confirmar imediatamente para permitir login)
    let user;
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // Confirma automaticamente para permitir login
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

    // 3. Gerar link de verificação para enviar via Resend
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email: normalizedEmail,
        options: {
          redirectTo: "https://socialjuridico.com.br/login"
        }
      });

      if (!linkError && linkData?.properties?.action_link) {
        const verifyLink = linkData.properties.action_link;
        
        // --- Enviar Email via Resend com HTML Estilizado ---
        await resend.emails.send({
          from: 'Social Jurídico <contato@socialjuridico.com.br>',
          to: normalizedEmail,
          subject: 'Bem-vindo ao Social Jurídico - Confirme sua conta',
          html: `
            <div style="font-family: sans-serif; background-color: #0d0f12; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #d4af37;">
              <h1 style="color: #d4af37; text-align: center;">Bem-vindo ao Social Jurídico!</h1>
              <p style="font-size: 16px; line-height: 1.6;">Olá, <strong>${name}</strong>!</p>
              <p style="font-size: 16px; line-height: 1.6;">Obrigado por se juntar à nossa plataforma dedicada a conectar talentos jurídicos e soluções práticas.</p>
              <p style="font-size: 16px; line-height: 1.6; text-align: center; margin: 30px 0;">
                Para começar, por favor confirme seu endereço de email clicando no botão abaixo:
              </p>
              <div style="text-align: center;">
                <a href="${verifyLink}" style="background-color: #d4af37; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Confirmar minha conta</a>
              </div>
              <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 30px; text-align: center;">
                Este link expira em 24 horas. Se você não solicitou esta conta, ignore este email.
              </p>
              <hr style="border: 0; border-top: 1px solid rgba(212,175,55,0.2); margin: 30px 0;">
              <p style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;">
                Social Jurídico - Conectando o direito ao futuro.
              </p>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error("Erro ao enviar email de boas-vindas via Resend:", emailErr);
      // Não trava o cadastro se o email falhar, o usuário ainda existe e pode pedir reenvio
    }

    return {
      success: true,
      message: "Conta criada! Por favor, verifique sua caixa de entrada para confirmar seu email antes de fazer login.",
    };
  } catch (error) {
    console.error("Erro no signUpAction:", error);
    return {
      success: false,
      message: error.message || "Erro inesperado ao cadastrar.",
    };
  }
}

/**
 * Solicitação de recuperação de senha via Resend
 */
export async function forgotPasswordAction(email) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    // 1. Gerar link de recuperação via Supabase Admin
    const redirectUrl = "https://socialjuridico.com.br/atualizar-senha";

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
       type: "recovery",
       email: normalizedEmail,
       options: {
         redirectTo: redirectUrl
       }
    });

    if (linkError) {
      // Por segurança, não confirmamos se o email existe ou não (prevenção de enumeração)
      console.warn("Erro ao gerar link de recuperação:", linkError.message);
      return { success: true, message: "Se o email estiver cadastrado, você receberá um link de recuperação em breve." };
    }

    const recoveryLink = linkData.properties.action_link;

    // 2. Enviar email customizado via Resend
    await resend.emails.send({
      from: 'Social Jurídico <contato@socialjuridico.com.br>',
      to: normalizedEmail,
      subject: 'Recuperação de Senha - Social Jurídico',
      html: `
        <div style="font-family: sans-serif; background-color: #0d0f12; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #d4af37;">
          <h1 style="color: #d4af37; text-align: center;">Redefinição de Senha</h1>
          <p style="font-size: 16px; line-height: 1.6;">Você solicitou a recuperação da sua senha no <strong>Social Jurídico</strong>.</p>
          <p style="font-size: 16px; line-height: 1.6; text-align: center; margin: 30px 0;">
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center;">
            <a href="${recoveryLink}" style="background-color: #d4af37; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Redefinir Senha</a>
          </div>
          <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 30px;">
            Este link é válido por tempo limitado. Se você não solicitou isso, pode ignorar este email com segurança.
          </p>
          <hr style="border: 0; border-top: 1px solid rgba(212,175,55,0.2); margin: 30px 0;">
          <p style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;">
            Social Jurídico - Segurança e Praticidade para sua Advocacia.
          </p>
        </div>
      `
    });

    return { 
      success: true, 
      message: "Se o email estiver cadastrado, você receberá um link de recuperação em breve." 
    };
  } catch (error) {
    console.error("Erro no forgotPasswordAction:", error);
    return { success: false, message: "Ocorreu um erro ao processar sua solicitação." };
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
