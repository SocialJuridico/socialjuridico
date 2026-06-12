import {
  deleteAdminCase,
  patchAdminCase,
} from "./adminCaseMutations";
import { getAdminCases } from "./adminCasesRead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getAdminCases;
export const PATCH = patchAdminCase;
export const DELETE = deleteAdminCase;
