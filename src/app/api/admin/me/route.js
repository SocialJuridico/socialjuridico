import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          message: auth.message,
        },
        { status: auth.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: auth.admin,
    });
  } catch (error) {
    console.error("[Admin/Me] Erro inesperado:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no servidor",
      },
      { status: 500 },
    );
  }
}
