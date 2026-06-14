import { processDocumentationSafe } from "@/lib/platformContent/processDocumentationSafe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request, context) {
  return processDocumentationSafe(request, context);
}
