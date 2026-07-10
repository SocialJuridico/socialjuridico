import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { ingestTelemetry } from "@/lib/oraculo/telemetry/oraculoTelemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ingesta telemetria da atividade do aluno. Aceita fetch normal e
// navigator.sendBeacon (Content-Type text/plain com corpo JSON).
export async function POST(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  let payload = null;
  try {
    const raw = await request.text();
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }
  if (!payload || !payload.sessionKey) {
    return oraculoJson({ success: false, message: "Payload inválido." }, 400);
  }

  const result = await ingestTelemetry({ context: auth.context, payload });
  return oraculoJson({ success: Boolean(result.ok) });
}
