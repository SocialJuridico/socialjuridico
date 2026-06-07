import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  let pgClient = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    const db = supabaseAdmin || supabase;

    // Verificar se o usuário solicitante é ADMIN
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("id, role")
      .eq("id", user.id)
      .eq("role", "ADMIN")
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { success: false, message: "Variável DATABASE_URL não configurada no servidor" },
        { status: 500 }
      );
    }

    // Inicializar conexão com PostgreSQL
    pgClient = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();

    // 1. Queries de ACESSOS (page_views)
    const accessesDaily = await pgClient.query(`
      SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const accessesWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-"W"IW') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const accessesMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    // 2. Queries de ADVOGADOS (logins)
    const lawyersDaily = await pgClient.query(`
      SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const lawyersWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-"W"IW') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const lawyersMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    // 3. Queries de CLIENTES (logins)
    const clientsDaily = await pgClient.query(`
      SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const clientsWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-"W"IW') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    const clientsMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo') ASC;
    `);

    // Buscar contagem total de cadastrados e uso de ferramentas premium
    const [totalLawyersRes, totalClientsRes, usageStatsRes] = await Promise.all([
      db.from("advogados").select("id", { count: "exact", head: true }),
      db.from("clientes").select("id", { count: "exact", head: true }),
      db.from("advogados").select("uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb"),
    ]);

    const usageData = usageStatsRes.data || [];
    const totalLawyersWithStats = usageData.length || 1;

    const premiumUsageSummary = {
      redator: {
        total: usageData.reduce((acc, item) => acc + (item.uso_redator_ia || 0), 0),
        avg: Number((usageData.reduce((acc, item) => acc + (item.uso_redator_ia || 0), 0) / totalLawyersWithStats).toFixed(2)),
      },
      triagem: {
        total: usageData.reduce((acc, item) => acc + (item.uso_triagem || 0), 0),
        avg: Number((usageData.reduce((acc, item) => acc + (item.uso_triagem || 0), 0) / totalLawyersWithStats).toFixed(2)),
      },
      agenda: {
        total: usageData.reduce((acc, item) => acc + (item.uso_agenda || 0), 0),
        avg: Number((usageData.reduce((acc, item) => acc + (item.uso_agenda || 0), 0) / totalLawyersWithStats).toFixed(2)),
      },
      storage: {
        total: Number(usageData.reduce((acc, item) => acc + (item.uso_storage_mb || 0), 0).toFixed(2)),
        avg: Number((usageData.reduce((acc, item) => acc + (item.uso_storage_mb || 0), 0) / totalLawyersWithStats).toFixed(2)),
      },
    };

    // Buscar pesquisas de satisfação para calcular médias
    const [advSurveysRes, cliSurveysRes] = await Promise.all([
      db.from("pesquisas_satisfacao_advogados").select("*"),
      db.from("pesquisas_satisfacao_clientes").select("*"),
    ]);

    const advSurveys = advSurveysRes.data || [];
    const cliSurveys = cliSurveysRes.data || [];

    const ADV_QUESTIONS = [
      "q1_velocidade", "q2_marketplace", "q3_ia_redator", "q4_ia_personalidade",
      "q5_seguranca", "q6_prazos", "q7_crm", "q8_smartdocs", "q9_suporte", "q10_roi"
    ];
    const CLI_QUESTIONS = [
      "q1_cadastro", "q2_clareza", "q3_velocidade", "q4_confianca",
      "q5_qualidade", "q6_chat", "q7_transparencia", "q8_seguranca", "q9_pwa", "q10_recomendacao"
    ];

    let advSum = 0;
    advSurveys.forEach(item => {
      const sum = ADV_QUESTIONS.reduce((acc, key) => acc + (item[key] || 0), 0);
      advSum += sum / 10;
    });
    const advAvg = advSurveys.length > 0 ? (advSum / advSurveys.length) : 0;

    let cliSum = 0;
    cliSurveys.forEach(item => {
      const sum = CLI_QUESTIONS.reduce((acc, key) => acc + (item[key] || 0), 0);
      cliSum += sum / 10;
    });
    const cliAvg = cliSurveys.length > 0 ? (cliSum / cliSurveys.length) : 0;

    const totalSurveys = advSurveys.length + cliSurveys.length;
    const overallAvg = totalSurveys > 0 ? ((advSum + cliSum) / totalSurveys) : 0;

    return NextResponse.json({
      success: true,
      data: {
        accesses: {
          daily: accessesDaily.rows,
          weekly: accessesWeekly.rows,
          monthly: accessesMonthly.rows,
        },
        lawyers: {
          daily: lawyersDaily.rows,
          weekly: lawyersWeekly.rows,
          monthly: lawyersMonthly.rows,
        },
        clients: {
          daily: clientsDaily.rows,
          weekly: clientsWeekly.rows,
          monthly: clientsMonthly.rows,
        },
        totals: {
          lawyers: totalLawyersRes.count || 0,
          clients: totalClientsRes.count || 0,
        },
        satisfaction: {
          overallAvg: Number(overallAvg.toFixed(1)),
          advAvg: Number(advAvg.toFixed(1)),
          cliAvg: Number(cliAvg.toFixed(1)),
          totalSurveys: totalSurveys,
        },
        premiumUsageSummary
      }
    });

  } catch (error) {
    console.error("Erro na API GET /api/admin/reports/usage:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  } finally {
    if (pgClient) {
      try {
        await pgClient.end();
      } catch (err) {
        console.error("Erro ao fechar conexão PG:", err);
      }
    }
  }
}
