"use server";

import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';

export async function signUpAction(formData) {
  const { email, password, name, phone, role, oab, estado } = formData;
  const supabase = createClient();

  try {
    // 1. Criar o usuário no Auth do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error("Erro ao criar usuário.");

    // 2. Inserir na tabela correspondente (clientes ou advogados)
    const table = role === 'LAWYER' ? 'advogados' : 'clientes';
    
    const insertData = {
      id: user.id,
      email: email,
      name: name,
      phone: phone,
      role: role,
      created_at: new Date().toISOString(),
    };

    if (role === 'LAWYER') {
      insertData.oab = oab;
      insertData.estado = estado;
    }

    const { error: dbError } = await supabase
      .from(table)
      .insert([insertData]);

    if (dbError) {
      console.error(`Erro ao inserir na tabela ${table}:`, dbError);
      // Opcional: deletar o usuário do auth se o banco falhar (requer service role)
      throw new Error(`Usuário criado, mas erro ao salvar perfil: ${dbError.message}`);
    }

    return { success: true, message: "Cadastro realizado! Verifique seu email para confirmar." };

  } catch (error) {
    console.error("Erro no signUpAction:", error);
    return { success: false, message: error.message || "Erro inesperado ao cadastrar." };
  }
}

export async function signInAction(email, password) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Tenta pegar o metadado diretamente das identidades ou da sessão
    const needsUpdate = data.user?.user_metadata?.needs_password_update === true;

    console.log("DEBUG LOGIN:", { 
      email: data.user?.email, 
      metadata: data.user?.user_metadata,
      needsUpdate 
    });

    return { 
      success: true, 
      user: data.user,
      needsPasswordUpdate: needsUpdate 
    };
  } catch (error) {
    console.error("Erro no signInAction:", error);
    return { success: false, message: error.message || "Credenciais inválidas." };
  }
}

export async function updatePasswordAction(newPassword) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { needs_password_update: false } // Remove o marcador após sucesso
    });

    if (error) throw error;

    return { success: true, message: "Senha atualizada com sucesso!" };
  } catch (error) {
    console.error("Erro no updatePasswordAction:", error);
    return { success: false, message: error.message || "Erro ao atualizar senha." };
  }
}

export async function getAdvogadosAction() {
  try {
    const supabase = createClient();
    const { data, error } = await supabaseAdmin
      .from('advogados')
      .select('id, name, avatar, oab, estado, avg_rating, verified, specialties')
      .order('name', { ascending: true });

    if (error) {
      console.error("Erro Supabase:", error);
      throw error;
    }

    console.log("Advogados recuperados do banco:", data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Erro no getAdvogadosAction:", error);
    return { success: false, message: error.message || "Erro ao buscar advogados." };
  }
}

export async function createCasoAction(casoData) {
  try {
    const { titulo, descricao, area_atuacao, cliente_id, anexos } = casoData;
    const supabase = createClient();

    const { data, error } = await supabase
      .from('casos')
      .insert([
        {
          titulo,
          descricao,
          area_atuacao,
          cliente_id,
          anexos, // Array de URLs do Supabase Storage
          status: 'ABERTO',
          created_at: new Date().toISOString()
        }
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
      .from('casos')
      .update({
        titulo,
        descricao,
        area_atuacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select();

    if (error) {
      console.error("Erro no Supabase ao atualizar caso:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("Nenhum caso foi atualizado (ID não encontrado ou sem permissão).");
      return { success: false, message: "Não foi possível encontrar o caso para atualizar." };
    }

    console.log("Caso atualizado com sucesso:", data[0].id);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Erro no updateCasoAction:", error);
    return { success: false, message: error.message || "Erro ao atualizar caso." };
  }
}

export async function getNotificacoesAction(userId) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Erro no getNotificacoesAction:", error);
    return { success: false, message: error.message || "Erro ao buscar notificações." };
  }
}


export async function getClientProfileAction(userId) {
  try {
    const supabase = createClient();
    const clientToUse = supabaseAdmin || supabase;
    
    // 1. Tenta em Clientes
    let { data, error } = await clientToUse
      .from('clientes')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error) return { success: true, data };

    // 2. Tenta em Advogados
    console.warn("Não achou em clientes, tentando advogados...");
    const { data: advData, error: advError } = await clientToUse
      .from('advogados')
      .select('*')
      .eq('id', userId)
      .single();

    if (!advError) return { success: true, data: advData };

    // 3. Tenta em Admins
    console.warn("Não achou em advogados, tentando admins...");
    const { data: adminData, error: adminError } = await clientToUse
      .from('admins')
      .select('*')
      .eq('id', userId)
      .single();

    if (!adminError) return { success: true, data: adminData };

    // Se chegou aqui, não achou em lugar nenhum
    throw new Error("Perfil não encontrado em nenhuma categoria (Cliente, Advogado ou Admin).");
    
  } catch (error) {
    console.error("Erro no getClientProfileAction:", error);
    return { success: false, message: error.message || "Erro ao buscar perfil." };
  }
}

export async function updateClientProfileAction(userId, updateData) {
  try {
    const { name, phone } = updateData;
    const supabase = createClient();

    // 1. Atualizar na tabela clientes
    const { error: dbError } = await supabase
      .from('clientes')
      .update({ name, phone })
      .eq('id', userId);

    if (dbError) throw dbError;

    // 2. Opcional: Atualizar no Auth (full_name)
    await supabase.auth.updateUser({
      data: { full_name: name }
    });

    return { success: true, message: "Perfil atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro no updateClientProfileAction:", error);
    return { success: false, message: error.message || "Erro ao atualizar perfil." };
  }
}

export async function deleteAccountAction(userId) {
  try {
    const supabase = createClient();
    // 1. Deletar da tabela clientes
    const { error: dbError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', userId);

    if (dbError) throw dbError;

    // 2. Deletar do Auth (Requer supabaseAdmin / Service Role)
    if (!supabaseAdmin) {
       throw new Error("Permissão de administrador não configurada.");
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return { success: true, message: "Conta excluída com sucesso." };
  } catch (error) {
    console.error("Erro no deleteAccountAction:", error);
    return { success: false, message: error.message || "Erro ao excluir conta." };
  }
}
