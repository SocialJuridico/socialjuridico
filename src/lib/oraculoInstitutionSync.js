import {
  buildFormalSupervisor,
  buildInstitutionPerson,
} from "@/lib/oraculoInstitutionPayload";

export const ORACULO_PERSON_PAYLOAD_KEYS = {
  representante_legal: "REPRESENTANTE_LEGAL",
  coordenador_curso: "COORD_CURSO",
  coordenador_npj: "COORD_NPJ",
  professor_orientador: "PROFESSOR_ORIENTADOR",
  encarregado_lgpd: "ENCARREGADO_LGPD",
};

export async function syncInstitutionPeople(db, instituicaoId, pessoas = {}) {
  const rows = Object.entries(ORACULO_PERSON_PAYLOAD_KEYS)
    .map(([key, papel]) => ({
      ...buildInstitutionPerson(pessoas[key], papel),
      instituicao_id: instituicaoId,
    }))
    .filter((row) => row.nome.length >= 3);

  const papels = Object.values(ORACULO_PERSON_PAYLOAD_KEYS);
  const { error: deleteError } = await db
    .from("oraculo_instituicao_pessoas")
    .delete()
    .eq("instituicao_id", instituicaoId)
    .in("papel", papels);

  if (deleteError) {
    throw new Error(`Falha ao limpar pessoas vinculadas: ${deleteError.message}`);
  }

  if (!rows.length) return;

  const { error: insertError } = await db
    .from("oraculo_instituicao_pessoas")
    .insert(rows);

  if (insertError) {
    throw new Error(`Falha ao salvar pessoas vinculadas: ${insertError.message}`);
  }
}

export async function syncInstitutionMainSupervisor(
  db,
  instituicaoId,
  supervisor = {},
) {
  const row = buildFormalSupervisor(supervisor);
  const { error: deleteError } = await db
    .from("oraculo_supervisores_formais")
    .delete()
    .eq("instituicao_id", instituicaoId)
    .eq("principal", true);

  if (deleteError) {
    throw new Error(`Falha ao limpar supervisor formal: ${deleteError.message}`);
  }

  if (row.nome.length < 3) return;

  const { error: insertError } = await db
    .from("oraculo_supervisores_formais")
    .insert([{ ...row, instituicao_id: instituicaoId }]);

  if (insertError) {
    throw new Error(`Falha ao salvar supervisor formal: ${insertError.message}`);
  }
}
