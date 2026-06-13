import {
  createLawyerSiteRequest,
  listLawyerSiteRequests,
} from "@/lib/siteRequests/siteRequestServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listLawyerSiteRequests;
export const POST = createLawyerSiteRequest;
