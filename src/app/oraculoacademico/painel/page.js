import { redirect } from "next/navigation";
import { Scale } from "lucide-react";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

import styles from "./Painel.module.css";

const STATUS_LABELS = {
  CADASTRO_INCOMPLETO: {
    title: "Cadastro básico concluído",
    description:
      "Recebemos seus dados iniciais. As próximas etapas — formação acadêmica, comprovantes, áreas de interesse e indicação de supervisores — ainda estão em construção. Você será avisado por e-mail assim que puderem ser preenchidas.",
  },
  PENDENTE_DOCUMENTOS: {
    title: "Aguardando validação de documentos",
    description:
      "Seus documentos foram enviados e estão em análise pela nossa equipe.",
  },
  PENDENTE_SUPERVISOR: {
    title: "Aguardando aprovação de supervisor",
    description:
      "Falta pelo menos um advogado supervisor confirmar seu convite de padrinho.",
  },
  PENDENTE_ADMIN: {
    title: "Aguardando validação do admin",
    description:
      "Seus documentos e supervisores foram confirmados. Falta a validação final da nossa equipe.",
  },
  ATIVO: {
    title: "Oráculo ativo",
    description: "Seu acesso ao Oráculo Acadêmico está liberado.",
  },
  RESTRITO: {
    title: "Acesso restrito",
    description:
      "Seu acesso está temporariamente restrito. Entre em contato com o suporte para mais detalhes.",
  },
  SUSPENSO: {
    title: "Cadastro suspenso",
    description:
      "Seu cadastro foi suspenso. Entre em contato com o suporte para mais detalhes.",
  },
  REPROVADO: {
    title: "Cadastro reprovado",
    description:
      "Seu cadastro não foi aprovado. Entre em contato com o suporte para mais detalhes.",
  },
};

export const metadata = {
  title: "Painel do Oráculo Acadêmico",
};

export default async function OraculoAcademicoPainelPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/oraculoacademico/login");
  }

  const db = supabaseAdmin || supabase;
  const { data: profile } = await db
    .from("oraculo_profissionais")
    .select("name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/oraculoacademico");
  }

  const statusInfo =
    STATUS_LABELS[profile.status] || STATUS_LABELS.CADASTRO_INCOMPLETO;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>
          <Scale size={16} aria-hidden="true" />
          Oráculo Acadêmico
        </span>

        <h1>Olá, {profile.name?.split(" ")[0] || "Oráculo"}.</h1>

        <div className={styles.statusBadge} data-status={profile.status}>
          {statusInfo.title}
        </div>

        <p>{statusInfo.description}</p>
      </div>
    </main>
  );
}
