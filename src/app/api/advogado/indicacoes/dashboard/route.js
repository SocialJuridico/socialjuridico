import { getLawyerReferrals } from "../referralRead";

export const dynamic = "force-dynamic";

export async function GET() {
  return getLawyerReferrals();
}
