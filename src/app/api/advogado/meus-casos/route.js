import { listLawyerCases } from "@/lib/lawyerCases/lawyerCaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listLawyerCases;
