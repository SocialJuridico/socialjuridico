import { redirect } from "next/navigation";

import { createSignatureClient } from "@/lib/signatureSupabaseServer";

import SignatureActivationClient from "./SignatureActivationClient";

export const metadata = {
  title: "Ativar conta de assinatura",
  robots: { index: false, follow: false },
};

export default async function SignatureActivationPage() {
  const supabase = createSignatureClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user?.id || !user.email) redirect("/assinatura/entrar");

  const { data: account } = await supabase
    .from("signature_accounts")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (account?.status === "ACTIVE") redirect("/assinatura/app");

  return (
    <SignatureActivationClient
      email={user.email}
      suggestedName={String(user.user_metadata?.full_name || "").trim().slice(0, 120)}
    />
  );
}
