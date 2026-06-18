import { ImageResponse } from "next/og";

export const alt = "Social Jurídico Assinatura - confiança em cada documento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "66px 72px",
        color: "#f7f7f4",
        background: "#0b0c0e",
        borderTop: "12px solid #d4af37",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: 8, color: "#111", background: "#d4af37", fontSize: 32, fontWeight: 800 }}>SJ</div>
        <div style={{ display: "flex", fontSize: 27, fontWeight: 700 }}>Social Jurídico <span style={{ marginLeft: 11, color: "#efd874" }}>Assinatura</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
        <div style={{ color: "#efd874", fontSize: 20, textTransform: "uppercase", letterSpacing: 3 }}>Assinatura eletrônica</div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 68, fontWeight: 800, lineHeight: 1.08 }}>Confiança e evidências em cada documento.</div>
        <div style={{ display: "flex", marginTop: 25, color: "#aaa", fontSize: 25 }}>Envie, acompanhe, assine e valide online.</div>
      </div>
      <div style={{ display: "flex", gap: 34, color: "#c6c6c2", fontSize: 18 }}>
        <span>Cadeia de custódia</span><span>•</span><span>Trilha de auditoria</span><span>•</span><span>Validação</span>
      </div>
    </div>,
    size,
  );
}
