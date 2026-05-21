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
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC;
    `);

    const accessesWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-"W"IW') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at)
      ORDER BY date_trunc('week', created_at) ASC;
    `);

    const accessesMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as date, count(*)::int as count
      FROM public.access_logs
      WHERE action = 'page_view' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC;
    `);

    // 2. Queries de ADVOGADOS (logins)
    const lawyersDaily = await pgClient.query(`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC;
    `);

    const lawyersWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-"W"IW') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at)
      ORDER BY date_trunc('week', created_at) ASC;
    `);

    const lawyersMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'LAWYER' AND action = 'login' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC;
    `);

    // 3. Queries de CLIENTES (logins)
    const clientsDaily = await pgClient.query(`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC;
    `);

    const clientsWeekly = await pgClient.query(`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-"W"IW') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY date_trunc('week', created_at)
      ORDER BY date_trunc('week', created_at) ASC;
    `);

    const clientsMonthly = await pgClient.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as date, count(distinct user_id)::int as count
      FROM public.access_logs
      WHERE user_role = 'CLIENT' AND action = 'login' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC;
    `);

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
        }
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
