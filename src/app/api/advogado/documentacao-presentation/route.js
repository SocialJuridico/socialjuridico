export const runtime = "nodejs";

export async function GET() {
  return new Response("Apresentação", { status: 200 });
}
