import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureDb } from '@/lib/dbSignatureHelper';
import { getAuthenticatedUser } from "@/lib/authServerUtils";

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

async function getSessionUser(req) {
  if (req) {
    const authHeader = req.headers.get("Authorization");
    const fallbackToken =
      req.headers.get("x-access-token") ||
      (req.url ? new URL(req.url).searchParams.get("token") : null);
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : fallbackToken;

    // Se houver indício de token, valida estritamente por token
    if (token && token !== "null" && token !== "undefined") {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) {
        console.error("[getSessionUser] Bearer token validation failed, blocking request");
        return null;
      }
      const { data: adv, error: advError } = await supabaseAdmin
        .from("advogados")
        .select("id, name, cargo, escritorio_id")
        .eq("id", authUser.id)
        .single();
      
      if (adv && !advError) {
        return {
          id: adv.id,
          name: adv.name,
          cargo: adv.cargo || "advogado",
          escritorio_id: adv.escritorio_id || null,
          isOfficeAdmin: false
        };
      }
      return null;
    }
  }

  // Fallback apenas para cookies (sem token)
  const cookieStore = await cookies();
  
  // 1. Verificação via Cookie do Escritório (Administrador / Gestor)
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        id: decoded.id,
        name: `${decoded.nome} (Gestor)`,
        cargo: "admin",
        escritorio_id: decoded.id,
        isOfficeAdmin: true
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Verificação via Supabase Auth (Advogado / Membro Normal)
  const authUser = await getAuthenticatedUser(req);
  if (authUser) {
    const { data: adv, error: advError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, cargo, escritorio_id")
      .eq("id", authUser.id)
      .single();
    
    if (adv && !advError) {
      return {
        id: adv.id,
        name: adv.name,
        cargo: adv.cargo || "advogado",
        escritorio_id: adv.escritorio_id || null,
        isOfficeAdmin: false
      };
    }
  }

  return null;
}

// GET /api/crm/assinatura -> Lista assinaturas do advogado logado (ou busca uma específica por ?id=...)
export async function GET(request) {
  try {
    await ensureDb();

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

    // Se busca por ID específico (usado na página pública de assinatura e pelo advogado)
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

      return NextResponse.json({ success: true, data });
    }

    // Listagem geral das assinaturas (apenas para advogados autenticados)
    const userSession = await getSessionUser(request);

    if (!userSession) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    let query = supabaseAdmin.from('assinaturas_digitais').select('*');

    if (userSession.escritorio_id) {
      const { data: membros } = await supabaseAdmin
        .from('advogados')
        .select('id')
        .eq('escritorio_id', userSession.escritorio_id);
      
      const memberIds = (membros || []).map(m => m.id);
      if (userSession.isOfficeAdmin) {
        memberIds.push(userSession.id);
      }
      query = query.in('lawyer_id', memberIds);
    } else {
      query = query.eq('lawyer_id', userSession.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
    const userSession = await getSessionUser(request);

    if (!userSession) {
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
      lawyer_id: userSession.id,
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
