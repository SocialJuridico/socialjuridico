import OnboardingModal from "@/components/Onboarding/OnboardingModal";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

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

  // Ler role do user_metadata
  const role = user.user_metadata?.role || "CLIENT";
  const normalizedRole = String(role).toUpperCase();

  if (normalizedRole === "LAWYER" || normalizedRole === "ADVOGADO") {
    redirect("/dashboard/advogado");
  } else {
    redirect("/dashboard/cliente");
  }
}
