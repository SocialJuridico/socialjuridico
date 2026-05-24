import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// No lado do cliente, o createBrowserClient sincroniza com os cookies de autenticação do Next.js.
// No lado do servidor, usamos createClient padrão como fallback para prevenir erros durante compilação estática.
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createClient(supabaseUrl, supabaseAnonKey);

// Só inicializamos o Admin se a chave estiver presente (previne erro no lado do cliente)
export const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;

if (supabaseAdmin) {
  const originalGetUser = supabaseAdmin.auth.getUser.bind(supabaseAdmin.auth);
  supabaseAdmin.auth.getUser = async (jwt) => {
    if (jwt) {
      // Cria um cliente temporário com a chave anônima para evitar que o SDK
      // envie o service_role_key no cabeçalho Authorization da validação de token,
      // o que causava o erro "Auth session missing!" no GoTrue.
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      return tempClient.auth.getUser(jwt);
    }
    return originalGetUser();
  };
}

