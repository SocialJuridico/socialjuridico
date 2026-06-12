import { mutateAdminAffiliate } from "./affiliateAdminMutations";
import { getGuardedAdminAffiliates } from "./affiliateAdminReadGuarded";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getGuardedAdminAffiliates;
export const POST = mutateAdminAffiliate;
