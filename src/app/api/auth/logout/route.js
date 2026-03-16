import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });

    // Limpar cookie de controle de sessão
    response.cookies.delete('sj_login_time');

    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json({ success: false, message: 'Erro ao efetuar logout.' }, { status: 500 });
  }
}
