import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: "No admin client" });
  const { data, error } = await supabaseAdmin.storage.listBuckets();
  const info = data?.map(b => ({ name: b.name, public: b.public }));
  return NextResponse.json({ info, error });
}
