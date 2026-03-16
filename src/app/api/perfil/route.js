import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Campos seguros que existem em TODAS as tabelas (clientes, advogados, admins)
const SAFE_FIELDS = 'id, name, email, role, phone, avatar, bio, oab, specialties, verified, created_at, is_premium, badges, avg_rating, total_ratings';

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const tables = ['clientes', 'advogados', 'admins'];
    let profile = null;

    // 1ª tentativa: buscar por ID
    for (const table of tables) {
      const { data, error } = await db.from(table).select(SAFE_FIELDS).eq('id', user.id).single();
      if (data && !error) { profile = data; break; }
    }

    // 2ª tentativa: buscar por email (caso o ID Auth difira do ID no banco)
    if (!profile) {
      console.log(`[perfil] Buscando por email: ${user.email}`);
      for (const table of tables) {
        const { data, error } = await db.from(table).select(SAFE_FIELDS).eq('email', user.email).single();
        if (data && !error) { profile = data; break; }
      }
    }

    // 3ª tentativa: criar perfil padrão
    if (!profile) {
      console.warn(`[perfil] Criando perfil padrão para ${user.email}`);
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'CLIENT',
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await db
        .from('clientes')
        .insert([newProfile])
        .select(SAFE_FIELDS)
        .single();

      if (!insertError && inserted) {
        profile = inserted;
      } else {
        console.error(`[perfil] Erro ao criar perfil:`, insertError?.message);
        // Última chance: tentar buscar de novo (pode ter dado unique constraint se já existe)
        const { data: retry } = await db.from('clientes').select(SAFE_FIELDS).eq('email', user.email).single();
        if (retry) profile = retry;
      }
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Perfil não encontrado. Entre em contato com o suporte." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: profile });

  } catch (error) {
    console.error("Erro na API GET /api/perfil:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const db = supabaseAdmin || supabase;

    // Descobrir em qual tabela o perfil está
    let profileTable = 'clientes';
    for (const table of ['clientes', 'advogados', 'admins']) {
      const { data } = await db.from(table).select('id').eq('id', user.id).single();
      if (data) { profileTable = table; break; }
    }

    const { error: updateError } = await db
      .from(profileTable)
      .update({ name: body.name, phone: body.phone })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Perfil atualizado" });
  } catch (error) {
    console.error("Erro na API PUT /api/perfil:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
