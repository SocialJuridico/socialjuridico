import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "Sessão encerrada com sucesso" });
    
    // Apagar o cookie da sessão do escritório
    response.cookies.set("sj_escritorio_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expirar imediatamente
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Logout Escritorio Error:", err);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
