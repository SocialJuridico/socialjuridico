import {
  fetchSurveyData,
  json,
  requireAdminAccess,
} from "./adminSurveys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireAdminAccess();
    if (!access.ok) return access.response;

    const data = await fetchSurveyData(access.db);

    return json({ success: true, data });
  } catch (error) {
    console.error("[Admin/Pesquisas][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar as pesquisas de satisfação.",
      },
      500,
    );
  }
}
