import {
  cancelLawyerInterest,
  listLawyerInterests,
} from "@/lib/lawyerInterests/lawyerInterestServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listLawyerInterests;
export const DELETE = cancelLawyerInterest;
