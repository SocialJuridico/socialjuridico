import { openLawyerServiceAdContact } from "@/lib/serviceAds/serviceAdServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const { id } = await context.params;
  return openLawyerServiceAdContact(request, String(id || ""));
}
