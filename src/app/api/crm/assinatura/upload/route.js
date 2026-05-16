import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "Arquivo é obrigatório" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const fileExt = file.name.split(".").pop();
    const filePath = `signatures/originals/${crypto.randomUUID()}.${fileExt}`;

    // Upload directly to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("crm_documents")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        document_url: publicUrl,
        original_hash: originalHash,
        file_name: file.name
      }
    });

  } catch (error) {
    console.error("Erro no upload do documento de assinatura:", error);
    return NextResponse.json({ success: false, message: "Erro ao fazer upload do documento" }, { status: 500 });
  }
}
