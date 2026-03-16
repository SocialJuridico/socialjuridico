import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const supabase = createClient();

    // 1. Autenticar no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ success: false, message: authError.message }, { status: 401 });
    }

    const user = authData.user;
    const clientToUse = supabaseAdmin || supabase;

    // 2. Buscar o perfil nas tabelas
    let profile = null;
    let roleFound = 'CLIENT';

    const tables = ['clientes', 'advogados', 'admins'];
    for (const table of tables) {
      const { data, error } = await clientToUse
        .from(table)
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        profile = data;
        roleFound = data.role;
        break;
      }
    }

    // 3. Se não achou perfil mas está logado, criar um padrão para evitar tela em branco
    if (!profile) {
      console.warn("User authenticated but profile not found. Creating default client profile.");
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'CLIENT',
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await clientToUse
        .from('clientes')
        .insert([newProfile]);
      
      if (!insertError) profile = newProfile;
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email.split('@')[0],
        role: profile?.role || 'CLIENT'
      }
    });

  } catch (error) {
    console.error("Erro na API de Login:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
