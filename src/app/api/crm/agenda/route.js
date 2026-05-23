import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { getUserPlanLimits, incrementUsage } from "@/lib/planUtils";

async function getSessionUser(request) {
  // 1. Verificação via Bearer Token (para mobile)
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
  
  // 2. Verificação via Cookie do Escritório (Administrador / Gestor)
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

  // 3. Verificação via Supabase Auth (Advogado / Membro Normal)
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

export async function GET(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const getEscritorio = searchParams.get('escritorio') === 'true';

    if (getEscritorio && user.escritorio_id) {
      // Buscar todos os membros ativos deste escritório
      const { data: membros, error: membrosError } = await supabaseAdmin
        .from('advogados')
        .select('id, name, email, cargo')
        .eq('escritorio_id', user.escritorio_id);

      if (membrosError) throw membrosError;

      const memberIds = membros.map(m => m.id);
      if (user.isOfficeAdmin) {
        memberIds.push(user.id);
      }

      // Buscar todos os itens de agenda de todos os membros do escritório
      const { data: agendaItems, error: agendaError } = await supabaseAdmin
        .from('agenda_items')
        .select('*')
        .in('lawyer_id', memberIds)
        .order('date', { ascending: true });

      if (agendaError) throw agendaError;

      return NextResponse.json({ 
        success: true, 
        data: agendaItems || [],
        membros: membros || []
      });
    } else {
      // Retorna apenas a agenda do usuário logado
      const { data, error } = await supabaseAdmin
        .from('agenda_items')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      return NextResponse.json({ success: true, data: data || [], membros: [] });
    }

  } catch (error) {
    console.error("Erro GET /api/crm/agenda:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar agenda" }, { status: 500 });
  }
}

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

    if (!planLimits.canUseAgenda()) {
      return NextResponse.json({ 
        success: false, 
        message: "LIMIT_REACHED", 
        error_type: "QUOTA_EXCEEDED" 
      }, { status: 403 });
    }

    // Buscar perfil do criador do evento
    const creatorProfile = user.isOfficeAdmin ? { escritorio_id: user.escritorio_id, cargo: 'admin' } : await (async () => {
      const { data } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id, cargo')
        .eq('id', user.id)
        .single();
      return data;
    })();

    // Determinar o lawyer_id final (quem é o responsável atribuído)
    let assignedLawyerId = user.id;
    if (body.lawyer_id && body.lawyer_id !== user.id && creatorProfile?.escritorio_id) {
      // Verificar se o advogado atribuído está no mesmo escritório
      const { data: targetProfile } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id')
        .eq('id', body.lawyer_id)
        .single();

      if (targetProfile && targetProfile.escritorio_id === creatorProfile.escritorio_id) {
        assignedLawyerId = body.lawyer_id;
      }
    }
    
    const payload = {
      id: crypto.randomUUID(),
      title: body.title,
      date: body.date,
      description: body.description,
      type: body.type,
      urgency: body.urgency,
      client_id: body.client_id,
      status: body.status || "PENDING",
      lawyer_id: assignedLawyerId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('agenda_items')
      .insert([payload])
      .select();

    if (error) throw error;

    // Incrementar uso após salvamento de sucesso
    await incrementUsage(supabaseAdmin || supabase, user.id, 'uso_agenda', 1);

    const savedEvent = data[0];

    // ==========================================
    // SINCRONIZAÇÃO COM GOOGLE CALENDAR
    // ==========================================
    try {
      const { data: profile } = await supabaseAdmin
        .from('advogados')
        .select('google_refresh_token, google_sync_enabled')
        .eq('id', assignedLawyerId)
        .single();

      if (profile && profile.google_sync_enabled && profile.google_refresh_token) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
        );
        
        oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const startDate = new Date(body.date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 

        const googleEvent = {
          summary: body.title,
          description: `${body.description || ''}\n\nTipo: ${body.type}\nUrgência: ${body.urgency}\n\n*Criado via SocialJurídico CRM*`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          colorId: body.urgency === 'HIGH' ? '11' : (body.urgency === 'MEDIUM' ? '5' : '9'),
        };

        const googleRes = await calendar.events.insert({
          calendarId: 'primary',
          resource: googleEvent,
        });

        await supabaseAdmin
          .from('agenda_items')
          .update({ google_event_id: googleRes.data.id })
          .eq('id', savedEvent.id);
      }
    } catch (calendarError) {
      console.error("⚠️ Erro ao sincronizar com Google Calendar:", calendarError.message);
    }

    return NextResponse.json({ success: true, data: savedEvent });

  } catch (error) {
    console.error("Erro POST /api/crm/agenda:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao salvar compromisso",
      details: error
    }, { status: 500 });
  }
}

// PATCH /api/crm/agenda -> Atualiza compromisso existente
export async function PATCH(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

    // Buscar o item existente para saber quem é o atual responsável
    const { data: existingItem } = await supabaseAdmin
      .from('agenda_items')
      .select('lawyer_id')
      .eq('id', id)
      .single();

    if (!existingItem) {
      return NextResponse.json({ success: false, message: "Compromisso não encontrado" }, { status: 404 });
    }

    // Buscar perfil do usuário para verificar permissão
    const userProfile = user.isOfficeAdmin ? { escritorio_id: user.escritorio_id, cargo: 'admin' } : await (async () => {
      const { data } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id, cargo')
        .eq('id', user.id)
        .single();
      return data;
    })();

    let hasPermission = existingItem.lawyer_id === user.id || user.isOfficeAdmin;

    if (!hasPermission && userProfile?.escritorio_id) {
      // Se estão no mesmo escritório, permite atualização
      const { data: targetProfile } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id')
        .eq('id', existingItem.lawyer_id)
        .single();

      if (targetProfile && targetProfile.escritorio_id === userProfile.escritorio_id) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ success: false, message: "Não autorizado a alterar este compromisso" }, { status: 403 });
    }

    // Se estiver reatribuindo para outro advogado, verificar se ele pertence ao mesmo escritório
    let finalLawyerId = existingItem.lawyer_id;
    if (updateData.lawyer_id && updateData.lawyer_id !== existingItem.lawyer_id && userProfile?.escritorio_id) {
      const { data: newTargetProfile } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id')
        .eq('id', updateData.lawyer_id)
        .single();

      if (newTargetProfile && newTargetProfile.escritorio_id === userProfile.escritorio_id) {
        finalLawyerId = updateData.lawyer_id;
      }
    }

    const payload = {
      ...updateData,
      lawyer_id: finalLawyerId
    };

    const { error } = await supabaseAdmin
      .from('agenda_items')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro PATCH /api/crm/agenda:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao atualizar agenda",
      details: error
    }, { status: 500 });
  }
}

// DELETE /api/crm/agenda -> Exclui compromisso
export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

    // Buscar o item existente
    const { data: existingItem } = await supabaseAdmin
      .from('agenda_items')
      .select('lawyer_id')
      .eq('id', id)
      .single();

    if (!existingItem) {
      return NextResponse.json({ success: false, message: "Compromisso não encontrado" }, { status: 404 });
    }

    // Buscar perfil do usuário para verificar permissão
    const userProfile = user.isOfficeAdmin ? { escritorio_id: user.escritorio_id, cargo: 'admin' } : await (async () => {
      const { data } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id, cargo')
        .eq('id', user.id)
        .single();
      return data;
    })();

    let hasPermission = existingItem.lawyer_id === user.id || user.isOfficeAdmin;

    if (!hasPermission && userProfile?.escritorio_id) {
      // Se estão no mesmo escritório, permite exclusão
      const { data: targetProfile } = await supabaseAdmin
        .from('advogados')
        .select('escritorio_id')
        .eq('id', existingItem.lawyer_id)
        .single();

      if (targetProfile && targetProfile.escritorio_id === userProfile.escritorio_id) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ success: false, message: "Não autorizado a excluir este compromisso" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('agenda_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro DELETE /api/crm/agenda:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao excluir agenda",
      details: error
    }, { status: 500 });
  }
}
