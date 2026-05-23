import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET /api/crm/client-cases?email=...&cpf=...
export async function GET(request) {
  try {
    let user = null;

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: u }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && u) user = u;
    }

    if (!user) {
      const supabase = createClient();
      const { data: { user: u }, error: authError } = await supabase.auth.getUser();
      if (!authError && u) user = u;
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const cpf_cnpj = searchParams.get('cpf_cnpj');

    if (!email && !cpf_cnpj) {
      return NextResponse.json({ success: false, message: "E-mail ou CPF é necessário para vincular casos" }, { status: 400 });
    }

    // 1. Primeiro, precisamos descobrir o ID do cliente público na tabela 'clientes'
    let publicClientId = null;
    
    if (email) {
      const { data: clientData } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (clientData) publicClientId = clientData.id;
    }

    // Se não achou por email e temos CPF, tenta por CPF (assumindo que a tabela clientes tenha cpf_cnpj)
    if (!publicClientId && cpf_cnpj) {
      const { data: clientData } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .eq('cpf_cnpj', cpf_cnpj) // Verificando se existe essa coluna em clientes no seu txt
        .maybeSingle();
      if (clientData) publicClientId = clientData.id;
    }

    if (!publicClientId) {
      return NextResponse.json({ success: true, data: [], message: "Cliente não possui conta pública no marketplace" });
    }

    // 2. Buscar casos na tabela 'casos' onde o advogado está contratado ou vinculado
    const { data: associatedCases, error } = await supabaseAdmin
      .from('casos')
      .select('*')
      .eq('cliente_id', publicClientId)
      .eq('advogado_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: associatedCases || [] });

  } catch (error) {
    console.error("Erro na API GET /api/crm/client-cases:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar casos associados" }, { status: 500 });
  }
}
