import {
  deleteAdminLawyer,
  sendAdminLawyerPasswordReset,
  updateAdminLawyer,
} from "./adminLawyersWrite";
import { getAdminLawyers } from "./adminLawyersRead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return getAdminLawyers();
}

export async function DELETE(request) {
  return deleteAdminLawyer(request);
}

export async function PATCH(request) {
  return sendAdminLawyerPasswordReset(request);
}

export async function PUT(request) {
  return updateAdminLawyer(request);
}
