import { createSignatureClient } from "@/lib/signatureSupabaseServer";
import { serializeSignatureEnvelope } from "@/lib/signatureProductServer";
import SignatureDashboardClient from "./SignatureDashboardClient";

export default async function SignatureAppPage() {
  const supabase = createSignatureClient();
  const { data: authData } = await supabase.auth.getUser();

  const { data: account } = await supabase
    .from("signature_accounts")
    .select("full_name, email")
    .eq("user_id", authData.user.id)
    .single();

  const { data: membership } = await supabase
    .from("signature_organization_members")
    .select("organization_id, role")
    .eq("user_id", authData.user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  const [organizationResult, subscriptionResult, usageResult, envelopesResult] =
    await Promise.all([
      supabase
        .from("signature_organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .single(),
      supabase
        .from("signature_subscriptions")
        .select("plan_code, documents_limit, certificates_limit, current_period_end")
        .eq("organization_id", membership.organization_id)
        .single(),
      supabase
        .from("signature_usage_periods")
        .select("documents_used, certificates_used")
        .eq("organization_id", membership.organization_id)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("signature_envelopes")
        .select(
          "id, title, document_type, message, status, verification_code, expires_at, sent_at, completed_at, created_at, updated_at, signature_recipients(id, name, email, role, signing_order, status, completed_at), signature_documents(id, original_name, size_bytes, sha256)",
        )
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const migrationRequired = ["42P01", "PGRST205"].includes(
    envelopesResult.error?.code,
  );

  return (
    <SignatureDashboardClient
      account={{
        name: account?.full_name || "Cliente",
        email: account?.email || authData.user.email || "",
        memberRole: membership.role,
      }}
      organization={{ name: organizationResult.data?.name || "Minha organização" }}
      subscription={
        subscriptionResult.data || {
          plan_code: "FREE",
          documents_limit: 3,
          certificates_limit: 0,
          current_period_end: null,
        }
      }
      usage={usageResult.data || { documents_used: 0, certificates_used: 0 }}
      initialEnvelopes={(envelopesResult.data || []).map(serializeSignatureEnvelope)}
      migrationRequired={migrationRequired}
    />
  );
}
