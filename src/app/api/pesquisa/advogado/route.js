import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    canEvaluate: false,
    reason:
      "Esta pesquisa foi encerrada. Responda a nova pesquisa de atualizacao da plataforma.",
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Esta pesquisa foi encerrada." },
    { status: 410 },
  );
}
