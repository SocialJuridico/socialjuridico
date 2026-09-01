import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleUserRound,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabaseServer";
import styles from "../OAuth.module.css";

export const dynamic = "force-dynamic";

const SCOPE_LABELS = {
  openid: "Confirmar sua identidade no Social Jurídico",
  email: "Acessar o endereço de e-mail da sua conta",
  profile: "Acessar seu nome e informações básicas de perfil",
};

function ErrorState({ message }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.brand}>
          <Scale size={20} aria-hidden="true" />
          Social Jurídico
        </div>

        <section className={`${styles.card} ${styles.errorCard}`}>
          <ShieldCheck size={36} aria-hidden="true" />
          <h1>Não foi possível continuar</h1>
          <p>{message}</p>
          <Link href="/" className={styles.homeLink}>
            Voltar ao Social Jurídico
          </Link>
        </section>
      </div>
    </main>
  );
}

export default async function OAuthConsentPage({ searchParams }) {
  const params = await searchParams;
  const authorizationId =
    typeof params?.authorization_id === "string" ? params.authorization_id : "";

  if (!authorizationId) {
    return <ErrorState message="O identificador da autorização não foi informado." />;
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect(`/oauth/login?authorization_id=${encodeURIComponent(authorizationId)}`);
  }

  const { data: authDetails, error: authorizationError } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (authorizationError || !authDetails) {
    return (
      <ErrorState
        message={
          authorizationError?.message ||
          "A solicitação de autorização é inválida ou expirou. Volte ao Rota da Justiça e tente novamente."
        }
      />
    );
  }

  if (!("authorization_id" in authDetails)) {
    redirect(authDetails.redirect_url);
  }

  const clientName = authDetails.client?.name || "Aplicativo externo";
  const scopes = (authDetails.scope || "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  const userName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Sua conta";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.brand}>
          <Scale size={20} aria-hidden="true" />
          Social Jurídico
        </div>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div className={styles.appBadge}>
              <Scale size={34} aria-hidden="true" />
            </div>
            <span className={styles.eyebrow}>Autorização de acesso</span>
            <h1 className={styles.title}>{clientName}</h1>
            <p className={styles.subtitle}>
              deseja usar sua conta Social Jurídico para identificar você com segurança.
            </p>
          </header>

          <div className={styles.body}>
            <div className={styles.identity}>
              <CircleUserRound className={styles.identityIcon} size={27} aria-hidden="true" />
              <div>
                <strong>{userName}</strong>
                <span>{user.email}</span>
              </div>
            </div>

            <p className={styles.permissionTitle}>Ao autorizar, o aplicativo poderá:</p>

            <ul className={styles.permissionList}>
              {scopes.length > 0 ? (
                scopes.map((scope) => (
                  <li key={scope} className={styles.permissionItem}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>{SCOPE_LABELS[scope] || `Usar a permissão “${scope}”`}</span>
                  </li>
                ))
              ) : (
                <li className={styles.permissionItem}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>Confirmar sua identidade para concluir o acesso.</span>
                </li>
              )}
            </ul>

            <div className={styles.privacyNote}>
              <LockKeyhole size={18} aria-hidden="true" />
              <span>
                Neste acesso não estão sendo solicitadas permissões para casos, documentos, conversas ou dados do CRM. Sua senha permanece no Social Jurídico e não é compartilhada com o Rota da Justiça.
              </span>
            </div>

            <form action="/api/oauth/decision" method="POST" className={styles.actions}>
              <input type="hidden" name="authorization_id" value={authorizationId} />
              <button
                type="submit"
                name="decision"
                value="deny"
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                name="decision"
                value="approve"
                className={`${styles.button} ${styles.primaryButton}`}
              >
                Autorizar acesso
              </button>
            </form>

            <p className={styles.helper}>
              Você poderá revogar autorizações futuras nas configurações da sua conta quando esse recurso estiver disponível.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
