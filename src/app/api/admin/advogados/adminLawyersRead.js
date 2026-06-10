import {
  json,
  listAllAuthUsers,
  requireAdmin,
} from "./adminLawyersUtils";

export async function getAdminLawyers() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;

    const [lawyersResult, authUsers] = await Promise.all([
      db
        .from("advogados")
        .select("*")
        .order("created_at", { ascending: false }),
      listAllAuthUsers(),
    ]);

    if (lawyersResult.error) {
      throw new Error(
        `Falha ao consultar advogados: ${lawyersResult.error.message}`,
      );
    }

    const lawyers = lawyersResult.data || [];
    const lawyerIds = lawyers.map((lawyer) => lawyer.id);
    const crmCountMap = new Map();
    const authUsersById = new Map(
      authUsers.map((user) => [user.id, user]),
    );
    const latestLogMap = new Map();

    const crmResult = await db
      .from("crm_clients")
      .select("advogado_id");

    if (crmResult.error) {
      console.warn(
        "[Admin/Advogados][GET] CRM indisponível; usando contagem zero:",
        crmResult.error.message,
      );
    } else {
      for (const client of crmResult.data || []) {
        if (!client.advogado_id) continue;

        crmCountMap.set(
          client.advogado_id,
          (crmCountMap.get(client.advogado_id) || 0) + 1,
        );
      }
    }

    if (lawyerIds.length > 0) {
      const { data: latestLogs, error: logsError } = await db
        .from("access_logs")
        .select("user_id, created_at")
        .in("user_id", lawyerIds)
        .order("created_at", { ascending: false });

      if (logsError) {
        console.warn(
          "[Admin/Advogados][GET] Logs de acesso indisponíveis; usando apenas Auth:",
          logsError.message,
        );
      } else {
        for (const log of latestLogs || []) {
          if (!latestLogMap.has(log.user_id)) {
            latestLogMap.set(log.user_id, log.created_at);
          }
        }
      }
    }

    const formattedData = lawyers.map((lawyer) => {
      const authLogin =
        authUsersById.get(lawyer.id)?.last_sign_in_at || null;
      const activityLog = latestLogMap.get(lawyer.id) || null;
      let lastSignIn = authLogin;

      if (
        activityLog &&
        (!lastSignIn || new Date(activityLog) > new Date(lastSignIn))
      ) {
        lastSignIn = activityLog;
      }

      const expiration = lawyer.premium_expires_at
        ? new Date(lawyer.premium_expires_at)
        : null;
      const planExpired =
        expiration && !Number.isNaN(expiration.getTime())
          ? expiration.getTime() < Date.now()
          : false;

      return {
        ...lawyer,
        crm_count: crmCountMap.get(lawyer.id) || 0,
        last_sign_in_at: lastSignIn,
        plan_expired: planExpired,
        plan_inconsistent:
          Boolean(planExpired && lawyer.is_premium) ||
          Boolean(lawyer.is_premium && !lawyer.premium_expires_at),
      };
    });

    return json({ success: true, data: formattedData });
  } catch (error) {
    console.error("[Admin/Advogados][GET] Erro:", error);

    return json(
      {
        success: false,
        message: "Não foi possível carregar os advogados.",
      },
      500,
    );
  }
}
