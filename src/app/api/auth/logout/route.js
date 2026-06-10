import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("sj_login_time", "", {
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("sj_last_login_logged", "", {
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Logout] Erro:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao efetuar logout.",
      },
      { status: 500 },
    );
  }
}
