import { cancelCaseSecure } from "./cancelCaseSecure";
import { createCase } from "./createCase";
import { getCases } from "./getCases";
import {
  updateCaseContentSecure,
  updateCaseStatusSecure,
} from "./updateCasesSecure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCase;
export const GET = getCases;
export const PUT = updateCaseContentSecure;
export const PATCH = updateCaseStatusSecure;
export const DELETE = cancelCaseSecure;
