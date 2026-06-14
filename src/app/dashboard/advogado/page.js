import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LawyerDashboardRootPage() {
  redirect("/dashboard/advogado/dashboard");
}
