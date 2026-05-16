import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get("url");

  if (!pdfUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    let absoluteUrl = pdfUrl;
    if (!pdfUrl.startsWith("http://") && !pdfUrl.startsWith("https://")) {
      const origin = request.nextUrl.origin;
      absoluteUrl = `${origin}${pdfUrl.startsWith("/") ? "" : "/"}${pdfUrl}`;
    }

    const response = await fetch(absoluteUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch PDF from remote source" }, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error proxying PDF:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
