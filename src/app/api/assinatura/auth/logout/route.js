import { NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { createSignatureClient } from "@/lib/signatureSupabaseServer";

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return NextResponse.json({ success: false, message: "Origem não autorizada." }, { status: 403 });
  }

  const supabase = createSignatureClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });
  response.cookies.delete("sj_signature_login_time");
  return response;
}
