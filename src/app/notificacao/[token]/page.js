import { supabaseAdmin } from "@/lib/supabase";
import { headers } from "next/headers";
import Link from "next/link";
import GeoTracker from "./GeoTracker"; // Vamos criar este componente cliente

export default async function NotificacaoPage({ params }) {
  const { token } = params;

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
        <h1>Token Inválido</h1>
      </div>
    );
  }

  // 1. Buscar a notificação no banco
  const { data: notificacao, error } = await supabaseAdmin
    .from('blindagem_notificacoes')
    .select('*')
    .eq('access_token', token)
    .single();

  if (error || !notificacao) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
        <h1>Notificação não encontrada</h1>
      </div>
    );
  }

  // 2. Capturar IP e User-Agent no Servidor
  const headersList = headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Desconhecido";
  const ua = headersList.get("user-agent") || "Desconhecido";

  // 3. Atualizar o banco com a leitura (se já não estiver lido ou para atualizar o histórico)
  // Vamos atualizar sempre a última leitura ou manter o registro da primeira
  if (notificacao.status !== 'lido') {
    await supabaseAdmin
      .from('blindagem_notificacoes')
      .update({
        status: 'lido',
        read_at: new Date().toISOString(),
        read_ip: ip,
        read_user_agent: ua
      })
      .eq('id', notificacao.id);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#fff', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#000' }}>Notificação Extrajudicial Digital</h1>
          <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '0.9rem' }}>Documento Autenticado e Rastreado</p>
        </div>

        {/* Body */}
        <div style={{ padding: '30px' }}>
          <div style={{ background: '#2c2c2c', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #444' }}>
            <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.8rem' }}>Protocolo de Rastreamento</p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem', color: '#00e676' }}>{notificacao.protocol}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#fff', fontSize: '1rem', lineHeight: '1.5' }}>
              Esta notificação possui validade jurídica. O seu acesso foi registrado com o IP <strong>{ip}</strong>.
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
              Para garantir a conformidade e integridade do processo, solicitamos a permissão de localização.
            </p>
          </div>

          {/* Componente Cliente para Geolocalização */}
          <GeoTracker tokenId={notificacao.id} />

          {/* Visualização do PDF */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Documento Original</h3>
            
            {notificacao.file_url ? (
              <div style={{ width: '100%', height: '500px', background: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                <iframe 
                  src={`${notificacao.file_url}#toolbar=0`} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Notificação PDF"
                />
              </div>
            ) : (
              <div style={{ padding: '20px', background: '#333', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ color: '#aaa' }}>Visualização indisponível. Baixe o arquivo abaixo.</p>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <a 
                href={notificacao.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ background: '#0070f3', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}
              >
                Download do Documento Original
              </a>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #444', margin: '30px 0' }} />

          <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
            <p>Este documento é protegido por criptografia e selado pela plataforma Social Jurídico.</p>
            <p>Hash SHA-512: {notificacao.hash_sha512}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
