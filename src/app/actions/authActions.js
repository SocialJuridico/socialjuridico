"use server";

import { createClient } from '@supabase/supabase-js';

// Usamos a Service Role Key no servidor para ignorar RLS durante o cadastro inicial, se necessário.
// Mas para segurança padrão, o client normal já resolve se o RLS permitir inserção.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUpAction(formData) {
  const { email, password, name, phone, role, oab, estado } = formData;

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
