import OnboardingModal from "@/components/Onboarding/OnboardingModal";
import { createClient } from "@/lib/supabaseServer";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Se não autenticado, redirecionar para login
  if (error || !user) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Login necessário</h2>
        <p>Por favor faça login para continuar.</p>
      </div>
    );
  }

  // Ler role do user_metadata — ajustável para chamar getRoleFromDatabase se necessário
  const role = user.user_metadata?.role || "CLIENT";

  return (
    <>
      <OnboardingModal
        role={role === "LAWYER" ? "LAWYER" : "CLIENT"}
        initialCompleted={false}
        redirectHref={
          role === "LAWYER" ? "/dashboard/advogado" : "/dashboard/cliente"
        }
      />
      <div style={{ padding: 24 }}>
        <h1>Onboarding</h1>
        <p>Se o modal não abriu, certifique-se de estar autenticado.</p>
      </div>
    </>
  );
}
