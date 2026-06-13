import { listLawyerOpportunities } from "@/lib/lawyerOpportunities/opportunityListingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listLawyerOpportunities;
