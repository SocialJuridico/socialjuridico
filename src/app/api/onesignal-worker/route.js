import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js");
    const content = await response.text();

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Erro ao fazer proxy do OneSignal Worker:", error);
    return new NextResponse("console.error('Falha ao carregar OneSignal Worker proxy')", {
      status: 500,
      headers: { "Content-Type": "application/javascript" },
    });
  }
}
