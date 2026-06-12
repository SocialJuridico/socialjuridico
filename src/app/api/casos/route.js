import { cancelCase } from "./cancelCase";
import { createCase } from "./createCase";
import { getCases } from "./getCases";
import {
  updateCaseContent,
  updateCaseStatus,
} from "./updateCases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCase;
export const GET = getCases;
export const PUT = updateCaseContent;
export const PATCH = updateCaseStatus;
export const DELETE = cancelCase;
