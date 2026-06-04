import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/auth/google-contacts/callback
 * Recebe o código de autorização do Google, troca por tokens e salva o refresh_token no perfil do administrador.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // ID do administrador passado anteriormente
    const errorParam = searchParams.get('error');

    // Se o usuário cancelou ou se ocorreu algum erro
    if (errorParam || !code || !userId) {
      console.warn("Google Contacts OAuth negado ou incompleto:", errorParam);
      return NextResponse.redirect(new URL('/dashboard/admin?google_contacts=error', request.url));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-contacts/callback`
    );

    // Trocar o código pelos tokens de acesso
    const { tokens } = await oauth2Client.getToken(code);
    
    // O refresh_token é o token persistente necessário para gerar novos access_tokens
    if (tokens.refresh_token) {
      // Salvar na tabela admins
      const { error: dbError } = await supabaseAdmin
        .from('admins')
        .update({ 
          google_refresh_token: tokens.refresh_token,
          google_sync_enabled: true 
        })
        .eq('id', userId);

      if (dbError) {
        console.error("Erro ao salvar google_refresh_token na tabela admins:", dbError);
        return NextResponse.redirect(new URL('/dashboard/admin?google_contacts=db_error', request.url));
      }
      
      console.log(`✅ Google Contacts conectado com sucesso para o administrador ${userId}`);
    } else {
      console.warn("⚠️ Google não retornou refresh_token para contatos. Ativando sincronização com token anterior.");
      // Se não retornou refresh_token, mas o admin consentiu novamente, marcamos como ativo
      await supabaseAdmin
        .from('admins')
        .update({ google_sync_enabled: true })
        .eq('id', userId);
    }

    // Redirecionar de volta para o dashboard admin com mensagem de sucesso
    return NextResponse.redirect(new URL('/dashboard/admin?google_contacts=success', request.url));

  } catch (error) {
    console.error("Erro no callback do Google Contacts OAuth:", error);
    return NextResponse.redirect(new URL('/dashboard/admin?google_contacts=error', request.url));
  }
}
