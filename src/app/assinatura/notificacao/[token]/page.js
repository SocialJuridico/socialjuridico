import { supabaseAdmin } from "@/lib/supabase";
import { headers } from "next/headers";
import Link from "next/link";
import GeoTracker from "./GeoTracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AssinaturaNotificacaoPage({ params }) {
  const { token } = await params;
  const documentUrl = `/api/assinatura/notificacao/${encodeURIComponent(token)}/arquivo`;

  if (!token) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0c0e12", color: "#fff" }}>
        <h1>Token Inválido</h1>
      </div>
    );
  }

  // 1. Fetch notification
  const { data: notification, error } = await supabaseAdmin
    .from("signature_extrajudicial_notifications")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();

  if (error || !notification) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0c0e12", color: "#fff" }}>
        <h1>Notificação não encontrada</h1>
      </div>
    );
  }

  // 2. Fetch headers for IP and User-Agent logging
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Desconhecido";
  const ua = headersList.get("user-agent") || "Desconhecido";

  // 3. Mark read status in DB if not already read
  if (notification.status !== "READ") {
    await supabaseAdmin
      .from("signature_extrajudicial_notifications")
      .update({
        status: "READ",
        read_at: new Date().toISOString(),
        read_ip: ip,
        read_user_agent: ua,
      })
      .eq("id", notification.id);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0c0e12", color: "#f3f4f6", fontFamily: "Inter, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", background: "#16191d", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.45)", border: "1px solid #252830" }}>
        
        {/* Header with official gold theme */}
        <div style={{ background: "linear-gradient(135deg, #00c853 0%, #00a03e 100%)", padding: "30px 20px", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "1.7rem", fontWeight: "bold", color: "#000", letterSpacing: "-0.02em" }}>Notificação Extrajudicial Digital</h1>
          <p style={{ margin: "6px 0 0 0", color: "#000", opacity: 0.85, fontSize: "0.95rem", fontWeight: "500" }}>Documento Autenticado e Rastreado</p>
        </div>

        {/* Body content */}
        <div style={{ padding: "30px" }}>
          <div style={{ background: "#1b1e23", padding: "16px 20px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #2d3139", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Protocolo de Rastreamento</p>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem", color: "#00c853" }}>{notification.protocol}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 4px 0", color: "#9ca3af", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</p>
              <span style={{ background: "rgba(0, 200, 83, 0.15)", color: "#00c853", padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "bold" }}>Ciência Registrada</span>
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <p style={{ color: "#d1d5db", fontSize: "1rem", lineHeight: "1.6" }}>
              Esta notificação possui validade jurídica. O seu acesso foi registrado com o endereço IP <strong>{ip}</strong>.
            </p>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem", lineHeight: "1.5" }}>
              Para garantir a integridade da cadeia de custódia e registrar a prova técnica completa, solicitamos a autorização de localização pelo navegador.
            </p>
          </div>

          {/* Privacy Disclaimer Card */}
          <div style={{ marginBottom: "28px", padding: "16px 20px", background: "rgba(0, 200, 83, 0.04)", border: "1px solid rgba(0, 200, 83, 0.15)", borderRadius: "8px" }}>
            <h2 style={{ margin: "0 0 8px 0", color: "#00c853", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Aviso de Privacidade e Finalidade
            </h2>
            <p style={{ margin: 0, color: "#d1d5db", fontSize: "0.85rem", lineHeight: 1.6 }}>
              A abertura deste link registra automaticamente dados técnicos de conexão (IP, User-Agent, data e hora) e, se concedida a permissão, as coordenadas de geolocalização. Estes dados são coletados única e exclusivamente para a composição do Certificado de Rastreabilidade e validade probatória da entrega da notificação extrajudicial.
            </p>
            <p style={{ margin: "10px 0 0 0", color: "#6b7280", fontSize: "0.8rem" }}>
              Para saber mais, consulte a <Link href="/privacidade" style={{ color: "#00c853", textDecoration: "underline" }}>Política de Privacidade</Link> e os <Link href="/termos" style={{ color: "#00c853", textDecoration: "underline" }}>Termos de Uso</Link>.
            </p>
          </div>

          {/* Invisible Geolocation Tracker Component */}
          <GeoTracker token={token} />

          {/* PDF Viewer Block */}
          <div style={{ marginTop: "32px" }}>
            <h3 style={{ color: "#f3f4f6", fontSize: "1.15rem", marginBottom: "16px", fontWeight: "600" }}>Visualização do Documento Original</h3>
            
            <div style={{ width: "100%", height: "550px", background: "#1f2229", borderRadius: "8px", overflow: "hidden", border: "1px solid #2d3139" }}>
              <iframe 
                src={`${documentUrl}?preview=1#toolbar=0`} 
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Notificação PDF"
              />
            </div>

            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <a 
                href={`${documentUrl}?download=1`} 
                style={{ background: "#00c853", color: "#000", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontSize: "0.95rem", display: "inline-block", transition: "background 0.2s" }}
              >
                Download do Documento Original
              </a>
            </div>
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #2d3139", margin: "35px 0" }} />

          {/* Validation hash */}
          <div style={{ textAlign: "center", color: "#6b7280", fontSize: "0.8rem" }}>
            <p style={{ margin: "0 0 4px 0" }}>Este documento é criptografado e selado eletronicamente pela plataforma Social Jurídico.</p>
            <p style={{ margin: 0, fontFamily: "monospace" }}>Hash SHA-512: {notification.hash_sha512}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
