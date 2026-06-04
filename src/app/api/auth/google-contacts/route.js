import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabaseServer';

/**
 * GET /api/auth/google-contacts
 * Inicia o fluxo de OAuth2 para conectar o Google Contacts do Administrador
 */
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-contacts/callback`
    );

    // Gerar a URL de autenticação
    const authUrl = oauth2Client.generateAuthUrl({
      // "offline" é obrigatório para receber o refresh_token!
      access_type: 'offline',
      // prompt="consent" força a tela de permissão, garantindo que o Google mande o refresh_token
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/contacts', // Permissão total de leitura e escrita nos contatos
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      // Passamos o ID do usuário (administrador) no parâmetro state
      state: user.id
    });

    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error("Erro ao iniciar Google Contacts OAuth:", error);
    return NextResponse.redirect(new URL('/dashboard/admin?error=google_auth_failed', request.url));
  }
}
