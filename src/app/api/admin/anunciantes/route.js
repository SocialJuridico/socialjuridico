import { mutateAdminAdvertiser } from "./adminAdvertiserMutations";
import { getAdminAdvertisers } from "./adminAdvertiserRead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getAdminAdvertisers;
export const POST = mutateAdminAdvertiser;
