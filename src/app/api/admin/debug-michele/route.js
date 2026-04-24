import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = supabaseAdmin;
  const { data: cols } = await db.from('admin_banners').select('*');
  return NextResponse.json({ cols });
}
