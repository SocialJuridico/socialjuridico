import { NextResponse } from "next/server";

import {
  getInstitutionAccessContext,
} from "@/lib/oraculoInstitutionAccess";
import {
  loadOraculoReportPayload,
  renderOraculoReportFile,
} from "@/lib/oraculoAcademicReportGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "pdf";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("id, instituicao_id")
    .eq("auth_user_id", user.id)
    .eq("status", "ATIVO")
    .limit(1);

  const membership = memberships?.[0];
  if (membershipError || !membership?.instituicao_id) {
    return NextResponse.json({ error: "Acesso institucional nao localizado." }, { status: 403 });
  }

  const access = await getInstitutionAccessContext({
    authUserId: user.id,
    instituicaoId: membership.instituicao_id,
  });

  if (!access?.permissions?.includes("INSTITUTION_VIEW_REPORTS")) {
    return NextResponse.json({ error: "Permissao insuficiente para baixar relatorios." }, { status: 403 });
  }

  try {
    const payload = await loadOraculoReportPayload({
      db: supabaseAdmin,
      reportId: id,
      instituicaoId: membership.instituicao_id,
    });
    const file = await renderOraculoReportFile({ payload, format });

    const downloadPath = `/api/oraculoacademico/instituicao/relatorios/${id}/download?format=${file.format}`;
    await supabaseAdmin
      .from("oraculo_relatorios_institucionais")
      .update({
        arquivo_url: downloadPath,
        hash_integridade: file.hash,
        metadata: {
          ...(payload.report.metadata || {}),
          ultimo_download_formato: file.format,
          ultimo_download_em: new Date().toISOString(),
        },
      })
      .eq("id", id)
      .eq("instituicao_id", membership.instituicao_id);

    await supabaseAdmin.from("oraculo_auditoria_institucional").insert([
      {
        instituicao_id: membership.instituicao_id,
        instituicao_usuario_id: membership.id,
        auth_user_id: user.id,
        usuario_email_snapshot: user.email,
        role_snapshot: access.roles?.[0] || null,
        permission_snapshot: "INSTITUTION_VIEW_REPORTS",
        evento_tipo: "INSTITUTION_REPORT_DOWNLOADED",
        evento_label: "Baixou relatorio institucional",
        acao: "BAIXAR_RELATORIO",
        recurso_tipo: "RELATORIO",
        recurso_id: id,
        recurso_label: payload.report.codigo_interno,
        resultado: "SUCESSO",
        metadata: { format: file.format, hash: file.hash },
      },
    ]);

    return new NextResponse(file.buffer, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Nao foi possivel gerar o relatorio." },
      { status: 500 },
    );
  }
}
