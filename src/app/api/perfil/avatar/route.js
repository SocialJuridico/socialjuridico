import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_AVATAR_SIZE_BYTES = 4 * 1024 * 1024;
const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
};

function json(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

async function findProfileTable(db, user) {
  for (const table of ["clientes", "advogados", "admins"]) {
    const { data } = await db
      .from(table)
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) return { table, id: data.id };
  }

  if (!user.email) return null;

  for (const table of ["clientes", "advogados", "admins"]) {
    const { data } = await db
      .from(table)
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    if (data) return { table, id: data.id };
  }

  return null;
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return json({ success: false, message: "Nao autorizado" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Servico de upload indisponivel." },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file !== "object") {
      return json(
        { success: false, message: "Arquivo e obrigatorio." },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return json(
        { success: false, message: "Envie uma imagem JPG, PNG ou WebP." },
        { status: 415 },
      );
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return json(
        { success: false, message: "A imagem deve ter no maximo 4MB." },
        { status: 413 },
      );
    }

    const profileRecord = await findProfileTable(supabaseAdmin, user);
    if (!profileRecord) {
      return json(
        { success: false, message: "Perfil nao encontrado." },
        { status: 404 },
      );
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type);
    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Erro no Storage (avatars):", uploadError.message);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from(profileRecord.table)
      .update({ avatar: publicUrl })
      .eq("id", profileRecord.id);

    if (updateError) {
      console.error("Erro ao atualizar avatar no banco:", updateError.message);
      throw updateError;
    }

    return json({
      success: true,
      message: "Avatar atualizado com sucesso",
      url: publicUrl,
    });
  } catch (error) {
    console.error("Erro no upload de avatar:", error);
    return json(
      {
        success: false,
        message: "Erro ao fazer upload do avatar.",
      },
      { status: 500 },
    );
  }
}
