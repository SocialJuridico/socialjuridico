import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: "Admin client not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `banner_${Date.now()}.${fileExt}`;

    // Convert file to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload using supabaseAdmin (bypasses RLS)
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
