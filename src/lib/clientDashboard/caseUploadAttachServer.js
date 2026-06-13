import { auditCaseUpload } from "@/lib/clientDashboard/caseUploadServer";

export async function attachCaseUploadsSafely(
  db,
  userId,
  caseId,
  tickets,
) {
  if (!tickets?.length) return;

  const ids = tickets.map((item) => item.id);
  const attachedAt = new Date().toISOString();

  const { data, error } = await db
    .from("client_case_uploads")
    .update({
      status: "ATTACHED",
      case_id: caseId,
      attached_at: attachedAt,
    })
    .in("id", ids)
    .eq("user_id", userId)
    .eq("status", "PENDING")
    .select("id, bucket, object_path");

  if (error) {
    throw new Error(`Falha ao vincular uploads ao caso: ${error.message}`);
  }

  if ((data || []).length !== ids.length) {
    const rollbackIds = (data || []).map((item) => item.id);
    if (rollbackIds.length) {
      await db
        .from("client_case_uploads")
        .update({
          status: "PENDING",
          case_id: null,
          attached_at: null,
        })
        .in("id", rollbackIds)
        .eq("user_id", userId);
    }

    const conflict = new Error(
      "Um dos arquivos mudou durante a publicação. Atualize o formulário e tente novamente.",
    );
    conflict.status = 409;
    throw conflict;
  }

  for (const item of tickets) {
    await auditCaseUpload(db, {
      uploadId: item.id,
      userId,
      action: "ATTACHED",
      bucket: item.bucket,
      objectPath: item.object_path,
      metadata: { case_id: caseId },
    }).catch((auditError) => {
      console.error(
        "[Casos/Uploads] Arquivo vinculado, mas auditoria falhou:",
        auditError.message,
      );
    });
  }
}
