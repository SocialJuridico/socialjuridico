import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// GET /api/crm/agenda -> Lista compromissos do advogado logado
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('agenda_items')
      .select('*')
      .eq('lawyer_id', user.id)
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });

  } catch (error) {
    console.error("Erro GET /api/crm/agenda:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar agenda" }, { status: 500 });
  }
}

// POST /api/crm/agenda -> Cria novo compromisso
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    const payload = {
      id: crypto.randomUUID(), // Garantir ID se não houver default no banco
      title: body.title,
      date: body.date,
      description: body.description,
      type: body.type,
      urgency: body.urgency,
      client_id: body.client_id,
      status: body.status || "PENDING",
      lawyer_id: user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('agenda_items')
      .insert([payload])
      .select();

    if (error) throw error;

    const savedEvent = data[0];

    // ==========================================
    // SINCRONIZAÇÃO COM GOOGLE CALENDAR
    // ==========================================
    try {
      // 1. Buscar preferências do advogado
      const { data: profile } = await supabaseAdmin
        .from('advogados')
        .select('google_refresh_token, google_sync_enabled')
        .eq('id', user.id)
        .single();

      if (profile && profile.google_sync_enabled && profile.google_refresh_token) {
        
        // 2. Configurar cliente do Google
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
        );
        
        oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Montar o objeto do evento (Google Calendar Format)
        // Precisamos converter a data (ex: '2023-12-01T14:30') para o fuso horário correto
        const startDate = new Date(body.date);
        
        // Vamos presumir que a reunião dure 1 hora por padrão (pois não temos end_time no form)
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
          colorId: body.urgency === 'HIGH' ? '11' : (body.urgency === 'MEDIUM' ? '5' : '9'), // Cores: Vermelho, Amarelo, Azul
        };

        // 4. Inserir no Google
        const googleRes = await calendar.events.insert({
          calendarId: 'primary',
          resource: googleEvent,
        });

        console.log(`✅ [Calendar] Evento sincronizado: ${googleRes.data.htmlLink}`);
        
        // Opcional: Salvar o ID do evento do Google no nosso banco se precisarmos deletar depois
        await supabaseAdmin
          .from('agenda_items')
          .update({ google_event_id: googleRes.data.id })
          .eq('id', savedEvent.id);
      }
    } catch (calendarError) {
      // Falhas no Google não devem quebrar o salvamento do CRM
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
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !user) {
        return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
      }
  
      const body = await request.json();
      const { id, ...updateData } = body;

      if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

      // Mapear campos se necessário e garantir que lawyer_id seja do usuário logado
      const payload = {
        ...updateData,
        lawyer_id: user.id
      };

      const { error } = await supabaseAdmin
        .from('agenda_items')
        .update(payload)
        .eq('id', id)
        .eq('lawyer_id', user.id);
  
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
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !user) {
        return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
      }
  
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('agenda_items')
        .delete()
        .eq('id', id)
        .eq('lawyer_id', user.id);
  
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
