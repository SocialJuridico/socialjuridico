import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    return NextResponse.json({ 
      success: true, 
      token: session?.access_token || null 
    });
  } catch (error) {
    console.error("Erro ao obter token da sessão:", error);
    return NextResponse.json({ 
      success: false, 
      token: null 
    }, { status: 500 });
  }
}
