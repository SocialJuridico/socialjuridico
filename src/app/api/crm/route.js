import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserPlanLimits } from "@/lib/planUtils";

async function getSessionUser(request) {
  // 3. Verificação via Bearer Token (para requisições mobile)
  if (request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (user && !error) {
        const { data: adv, error: advError } = await supabaseAdmin
          .from("advogados")
          .select("id, name, cargo, escritorio_id")
          .eq("id", user.id)
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
    }
  }

  const cookieStore = await cookies();
  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  
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
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: adv, error: advError } = await db
        .from("advogados")
        .select("id, name, cargo, escritorio_id")
        .eq("id", user.id)
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
  } catch (e) {
    console.error("Erro ao obter usuario autenticado:", e);
  }

  return null;
}

// GET /api/crm -> lista clientes do advogado logado ou de todo o escritório
export async function GET(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    if (user.escritorio_id) {
      // Buscar todos os membros ativos deste escritório
      const { data: membros, error: membrosError } = await supabaseAdmin
        .from('advogados')
        .select('id')
        .eq('escritorio_id', user.escritorio_id);

      if (membrosError) throw membrosError;

      const memberIds = membros.map(m => m.id);
      if (user.isOfficeAdmin) {
        memberIds.push(user.id);
      }

      const { data: clients, error } = await supabaseAdmin
        .from('crm_clients')
        .select('*')
        .in('lawyer_id', memberIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ success: true, data: clients || [] });
    } else {
      const { data: clients, error } = await supabaseAdmin
        .from('crm_clients')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ success: true, data: clients || [] });
    }

  } catch (error) {
    console.error("Erro na API GET /api/crm:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST /api/crm -> cadastra novo cliente
export async function POST(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createClient();

    // Verificação de Limites do Plano
    const planLimits = await getUserPlanLimits(supabaseAdmin || supabase, user.id);
    if (!planLimits) {
      return NextResponse.json({ success: false, message: "Erro ao ler limites do plano." }, { status: 400 });
    }

    // Contar quantos clientes o advogado já tem
    const { count: currentClients } = await supabaseAdmin
      .from('crm_clients')
      .select('*', { count: 'exact', head: true })
      .eq('lawyer_id', user.id);

    if ((currentClients || 0) >= planLimits.maxCrmClients) {
      return NextResponse.json({ 
        success: false, 
        message: "LIMIT_REACHED", 
        error_type: "QUOTA_EXCEEDED" 
      }, { status: 403 });
    }
    
    // Mapeamento dos campos do frontend para o banco
    const clientData = {
      id: crypto.randomUUID(),
      lawyer_id: user.id,
      name: body.nome_completo,
      type: body.tipo || 'Pessoa Física',
      cpf_cnpj: body.cpf_cnpj,
      rg: body.rg_ie,
      civil_status: body.estado_civil,
      profession: body.profissao,
      phone: body.telefone,
      address: body.endereco_completo,
      email: body.email,
      notes: body.notas_internas,
      status: 'Ativo',
      risk_score: Math.floor(Math.random() * 100),
      created_at: new Date().toISOString()
    };

    if (!clientData.name) {
      return NextResponse.json({ success: false, message: "Nome completo é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('crm_clients')
      .insert([clientData])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API POST /api/crm:", error);
    return NextResponse.json({ success: false, message: "Erro ao salvar cliente" }, { status: 500 });
  }
}

// PATCH /api/crm -> atualiza dados do cliente, incluindo delegação de responsável
export async function PATCH(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, lawyer_id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID do cliente é obrigatório" }, { status: 400 });
    }

    // 1. Buscar o cliente existente para verificar posse/permissão
    const { data: existingClient, error: getError } = await supabaseAdmin
      .from('crm_clients')
      .select('lawyer_id, name')
      .eq('id', id)
      .single();

    if (getError || !existingClient) {
      return NextResponse.json({ success: false, message: "Cliente não encontrado" }, { status: 404 });
    }

    // 2. Verificar se o usuário atual pertence ao mesmo escritório do dono do caso
    const { data: currentProfile } = await supabaseAdmin
      .from('advogados')
      .select('escritorio_id')
      .eq('id', user.id)
      .single();

    const { data: ownerProfile } = await supabaseAdmin
      .from('advogados')
      .select('escritorio_id')
      .eq('id', existingClient.lawyer_id)
      .single();

    const sameOffice = currentProfile && ownerProfile && (currentProfile.escritorio_id === ownerProfile.escritorio_id);
    const isOwner = existingClient.lawyer_id === user.id;

    // Apenas o proprietário, o administrador do escritório ou membros do mesmo escritório com permissão podem alterar
    if (!isOwner && !user.isOfficeAdmin && !sameOffice) {
      return NextResponse.json({ success: false, message: "Sem permissão para alterar este cliente" }, { status: 403 });
    }

    // 3. Se estiver alterando o responsável (lawyer_id / delegação)
    if (lawyer_id) {
      // Se não for o administrador, apenas permita se estiver no mesmo escritório
      if (!user.isOfficeAdmin && !sameOffice) {
        return NextResponse.json({ success: false, message: "Apenas administradores ou membros autorizados podem delegar casos" }, { status: 403 });
      }

      // Verificar se o novo advogado pertence ao escritório
      const { data: newLawyer } = await supabaseAdmin
        .from('advogados')
        .select('name, escritorio_id')
        .eq('id', lawyer_id)
        .single();

      if (!newLawyer || (currentProfile?.escritorio_id && newLawyer.escritorio_id !== currentProfile.escritorio_id)) {
        return NextResponse.json({ success: false, message: "Advogado destino inválido ou pertence a outro escritório" }, { status: 400 });
      }

      updateFields.lawyer_id = lawyer_id;
    }

    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('crm_clients')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Se houve delegação de caso, cria uma notificação instantânea para o novo advogado designado!
    if (lawyer_id && lawyer_id !== existingClient.lawyer_id) {
      try {
        await supabaseAdmin
          .from('notificacoes')
          .insert([{
            id: crypto.randomUUID(),
            user_id: lawyer_id,
            titulo: "🤝 Novo Caso Designado",
            mensagem: `Você foi designado como responsável pelo caso de ${updatedClient.name || "Cliente"}.`,
            lida: false,
            created_at: new Date().toISOString(),
            tipo: "case_assigned",
            meta: JSON.stringify({
              client_id: id,
              client_name: updatedClient.name
            })
          }]);
      } catch (notifError) {
        console.error("⚠️ Erro ao criar notificação de delegação:", notifError);
      }
    }

    return NextResponse.json({ success: true, data: updatedClient });

  } catch (error) {
    console.error("Erro na API PATCH /api/crm:", error);
    return NextResponse.json({ success: false, message: "Erro ao atualizar cliente" }, { status: 500 });
  }
}
