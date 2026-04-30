import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/auth/google/callback
 * Recebe o código do Google, troca por tokens e salva o refresh_token no banco.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // O ID do advogado que passamos na URL anterior
    const errorParam = searchParams.get('error');

    // Se o usuário recusou na tela do Google
    if (errorParam || !code || !userId) {
      console.warn("Google OAuth negado ou incompleto:", errorParam);
      return NextResponse.redirect(new URL('/dashboard/advogado?google_sync=error', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );

    // Trocar o código pelos tokens de acesso
    const { tokens } = await oauth2Client.getToken(code);
    
    // O refresh_token é o mais importante. O access_token expira rápido, o refresh não.
    if (tokens.refresh_token) {
      // Salvar no banco
      const { error: dbError } = await supabaseAdmin
        .from('advogados')
        .update({ 
          google_refresh_token: tokens.refresh_token,
          google_sync_enabled: true 
        })
        .eq('id', userId);

      if (dbError) {
        console.error("Erro ao salvar refresh token no Supabase:", dbError);
        return NextResponse.redirect(new URL('/dashboard/advogado?google_sync=db_error', request.url));
      }
      
      console.log(`✅ Google Calendar conectado com sucesso para advogado ${userId}`);
    } else {
      console.warn("⚠️ Google não retornou refresh_token. O usuário precisa revogar o acesso no Google e tentar novamente.");
      // Como pedimos prompt='consent', ele deveria retornar. Se não retornar, 
      // ativamos a sincronização apenas se ele já tinha um token salvo antes.
      await supabaseAdmin
        .from('advogados')
        .update({ google_sync_enabled: true })
        .eq('id', userId);
    }

    // Redirecionar de volta para o dashboard com mensagem de sucesso
    return NextResponse.redirect(new URL('/dashboard/advogado?google_sync=success', request.url));

  } catch (error) {
    console.error("Erro no callback do Google OAuth:", error);
    return NextResponse.redirect(new URL('/dashboard/advogado?google_sync=error', request.url));
  }
}
