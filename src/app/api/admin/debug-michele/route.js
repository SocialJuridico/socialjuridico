import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = supabaseAdmin;
  const { data: cols } = await db.rpc('get_case_columns'); // Just throwing something or we can query table schema
  // Let's just query 1 case to see its keys
  const { data: casos } = await db.from("casos").select("*").limit(1);
  return NextResponse.json({ keys: Object.keys(casos[0]) });
}
