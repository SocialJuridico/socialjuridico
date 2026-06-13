import { listRadarOpportunities } from "@/lib/lawyerOpportunities/radarServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listRadarOpportunities;
