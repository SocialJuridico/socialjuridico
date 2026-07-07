import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { getInstitutionAccessContext } from "@/lib/oraculoInstitutionAccess";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

import styles from "./InstitutionDashboard.module.css";

export default async function OraculoInstitutionDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/oraculoacademico/login");

  const { data: memberships } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("instituicao_id")
    .eq("auth_user_id", user.id)
    .eq("status", "ATIVO")
    .limit(1);

  const instituicaoId = memberships?.[0]?.instituicao_id;
  if (!instituicaoId) redirect("/oraculoacademico/login");

  const access = await getInstitutionAccessContext({
    authUserId: user.id,
    instituicaoId,
  });

  if (!access) redirect("/oraculoacademico/login");

  const { data: instituicao } = await supabaseAdmin
    .from("oraculo_instituicoes")
    .select("nome, status")
    .eq("id", instituicaoId)
    .maybeSingle();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.brand}>
          <GraduationCap size={24} aria-hidden="true" />
          Oraculo Academico
        </span>
        <h1>{instituicao?.nome || "Dashboard institucional"}</h1>
        <p>
          Acesso institucional ativo. Este ambiente mostra somente dados da sua
          instituicao e usa permissoes contextuais por role.
        </p>
      </section>

      <section className={styles.grid}>
        <div>
          <strong>Status</strong>
          <span>{access.status}</span>
        </div>
        <div>
          <strong>Roles</strong>
          <span>{access.roles.join(", ") || "Sem role ativa"}</span>
        </div>
        <div>
          <strong>Permissoes</strong>
          <span>{access.permissions.length} permissoes resolvidas</span>
        </div>
        <div>
          <strong>MFA</strong>
          <span>{access.mfaRequired ? "Obrigatorio" : "Nao obrigatorio"}</span>
        </div>
      </section>

      <Link href="/dashboard" className={styles.link}>
        Voltar aos meus ambientes
      </Link>
    </main>
  );
}
