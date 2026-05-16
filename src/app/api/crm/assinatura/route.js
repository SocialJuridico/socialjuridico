import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/dbSignatureHelper';

const generateVerificationCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evita O/0, I/1 para evitar ambiguidade na leitura visual
  const genPart = (len) => {
    let part = '';
    for (let i = 0; i < len; i++) {
      part += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return part;
  };
  return `SJ-${genPart(4)}-${genPart(4)}`;
};

// GET /api/crm/assinatura -> Lista assinaturas do advogado logado (ou busca uma específica por ?id=...)
export async function GET(request) {
  try {
    await ensureDb();
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');

    // Se busca por código de validação público (qualquer um pode acessar a validação pública)
    if (code) {
      const { data, error } = await supabaseAdmin
        .from('assinaturas_digitais')
        .select('*')
        .eq('verification_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ success: false, message: "Documento não encontrado" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data });
    }

    // Se busca por ID específico (apenas o advogado dono ou o próprio signatário logado)
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('assinaturas_digitais')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ success: false, message: "Assinatura não encontrada" }, { status: 404 });
      }

      // Segurança: Apenas o advogado dono ou os emails na metadata podem ver
      const meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      const isOwner = data.lawyer_id === user.id;
      const isPart = meta?.lawyer?.email === user.email || meta?.client?.email === user.email;

      if (!isOwner && !isPart) {
        return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 403 });
      }

      return NextResponse.json({ success: true, data });
    }

    // Listagem geral das assinaturas do advogado
    const { data, error } = await supabaseAdmin
      .from('assinaturas_digitais')
      .select('*')
      .eq('lawyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });

  } catch (error) {
    console.error("Erro na API GET /api/crm/assinatura:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar dados de assinatura" }, { status: 500 });
  }
}

// POST /api/crm/assinatura -> Cria um novo processo de assinatura digital
export async function POST(request) {
  try {
    await ensureDb();
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      client_id,
      document_name,
      document_url,
      original_hash,
      document_type, // 'contrato', 'procuracao', 'outro'
      lawyer_name,
      lawyer_email,
      client_name,
      client_email
    } = body;

    if (!document_name || !lawyer_name || !lawyer_email || !client_name || !client_email) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const verification_code = generateVerificationCode();

    const insertData = {
      lawyer_id: user.id,
      client_id: client_id || null,
      document_name,
      document_url: document_url || null,
      original_hash: original_hash || '',
      verification_code,
      status: 'pending',
      document_type: document_type || 'contrato',
      metadata: {
        lawyer: { 
          name: lawyer_name, 
          email: lawyer_email.toLowerCase().trim(), 
          signed: false, 
          signed_at: null, 
          ip: null, 
          user_agent: null, 
          otp: null, 
          otp_expires: null 
        },
        client: { 
          name: client_name, 
          email: client_email.toLowerCase().trim(), 
          signed: false, 
          signed_at: null, 
          ip: null, 
          user_agent: null, 
          otp: null, 
          otp_expires: null 
        },
        history: [
          { 
            event: "created", 
            timestamp: new Date().toISOString(), 
            details: "Processo de assinatura digital iniciado" 
          }
        ]
      }
    };

    const { data, error } = await supabaseAdmin
      .from('assinaturas_digitais')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Erro na API POST /api/crm/assinatura:", error);
    return NextResponse.json({ success: false, message: "Erro ao criar processo de assinatura" }, { status: 500 });
  }
}
