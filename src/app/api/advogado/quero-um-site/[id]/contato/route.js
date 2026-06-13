import { openLawyerSiteSalesContact } from "@/lib/siteRequests/siteRequestServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const { id } = await context.params;
  return openLawyerSiteSalesContact(request, String(id || ""));
}
