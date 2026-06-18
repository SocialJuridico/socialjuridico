import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabaseServer";
import { privateRobots } from "@/lib/seo";

export const metadata = {
  title: "Painel de assinaturas",
  robots: privateRobots,
};

export default async function SignatureAppLayout({ children }) {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) redirect("/assinatura/entrar");

  const [{ data: account }, { data: membership }] = await Promise.all([
    supabase
      .from("signature_accounts")
      .select("status")
      .eq("user_id", authData.user.id)
      .maybeSingle(),
    supabase
      .from("signature_organization_members")
      .select("organization_id, status")
      .eq("user_id", authData.user.id)
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!account || !membership) redirect("/assinatura/cadastro");
  if (account.status !== "ACTIVE") redirect("/assinatura/entrar?erro=conta-bloqueada");

  return children;
}

