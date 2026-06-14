import { NextResponse } from "next/server";

import {
  OFFICE_SESSION_COOKIE,
  OFFICE_SESSION_SIGNATURE_COOKIE,
} from "@/lib/officeSession";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso",
    });
    for (const name of [OFFICE_SESSION_COOKIE, OFFICE_SESSION_SIGNATURE_COOKIE]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("[Logout Escritório] Erro:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
