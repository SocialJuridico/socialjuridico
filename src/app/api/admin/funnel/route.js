import {
  json,
  maskEmail,
  requireAdminCaseAccess,
} from "../casos/adminCases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getJourneyStep(item) {
  if (item.responded_at) return "RESPONDED";
  if (item.viewed_interests_at) return "VIEWED_INTERESTS";
  if (item.logged_in_at) return "LOGGED_IN";
  if (item.clicked_at) return "CLICKED";
  if (item.opened_at) return "OPENED";
  return "SENT";
}

function getLastActivityAt(item) {
  const values = [
    item.responded_at,
    item.viewed_interests_at,
    item.logged_in_at,
    item.clicked_at,
    item.opened_at,
    item.sent_at,
  ]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) return null;
  return new Date(Math.max(...values)).toISOString();
}

function getJourneyAlert(item) {
  const sentAt = new Date(item.sent_at || 0).getTime();
  if (!sentAt || item.responded_at) return null;

  const ageHours = (Date.now() - sentAt) / 3_600_000;

  if (!item.opened_at && ageHours >= 24) {
    return {
      severity: "HIGH",
      code: "EMAIL_NOT_OPENED_24H",
      label: "E-mail não aberto há mais de 24h",
      recommendedAction: "Avaliar outro canal ou revisar o assunto.",
    };
  }

  if (item.opened_at && !item.clicked_at && ageHours >= 48) {
    return {
      severity: "MEDIUM",
      code: "EMAIL_OPENED_NOT_CLICKED_48H",
      label: "E-mail aberto, mas sem clique",
      recommendedAction: "Reforçar o benefício e a chamada para ação.",
    };
  }

  if (item.clicked_at && !item.viewed_interests_at && ageHours >= 48) {
    return {
      severity: "MEDIUM",
      code: "CLICKED_NOT_VIEWED_INTERESTS",
      label: "Cliente clicou, mas não visualizou interesses",
      recommendedAction: "Verificar barreiras de login ou navegação.",
    };
  }

  if (item.viewed_interests_at && !item.responded_at && ageHours >= 72) {
    return {
      severity: "HIGH",
      code: "VIEWED_NOT_RESPONDED_72H",
      label: "Interesses visualizados, mas sem resposta",
      recommendedAction: "Priorizar reengajamento do cliente.",
    };
  }

  return null;
}

function calculateSummary(events) {
  const summary = events.reduce(
    (current, event) => {
      current.sent += 1;
      if (event.openedAt) current.opened += 1;
      if (event.clickedAt) current.clicked += 1;
      if (event.loggedInAt) current.loggedIn += 1;
      if (event.viewedInterestsAt) current.viewedInterests += 1;
      if (event.respondedAt) current.responded += 1;
      if (event.alert) current.stalled += 1;
      return current;
    },
    {
      sent: 0,
      opened: 0,
      clicked: 0,
      loggedIn: 0,
      viewedInterests: 0,
      responded: 0,
      stalled: 0,
    },
  );

  const rate = (value) =>
    summary.sent ? Number(((value / summary.sent) * 100).toFixed(1)) : 0;

  return {
    ...summary,
    openRate: rate(summary.opened),
    clickRate: rate(summary.clicked),
    loginRate: rate(summary.loggedIn),
    interestViewRate: rate(summary.viewedInterests),
    responseRate: rate(summary.responded),
  };
}

export async function GET() {
  try {
    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    const { data: funnelData, error: funnelError } = await access.db
      .from("email_tracking_logs")
      .select(`
        id,
        case_id,
        recipient_email,
        email_type,
        user_id,
        client_id,
        interested_count,
        sent_at,
        opened_at,
        clicked_at,
        logged_in_at,
        viewed_interests_at,
        responded_at,
        casos (
          titulo
        ),
        clientes:client_id (
          name,
          email
        )
      `)
      .order("sent_at", { ascending: false })
      .limit(500);

    if (funnelError) {
      throw new Error(`Falha ao consultar o funil: ${funnelError.message}`);
    }

    const userIds = [
      ...new Set((funnelData || []).map((item) => item.user_id).filter(Boolean)),
    ];

    const lawyerMap = new Map();

    if (userIds.length) {
      const { data: lawyers, error: lawyersError } = await access.db
        .from("advogados")
        .select("id, name, email")
        .in("id", userIds);

      if (lawyersError) {
        throw new Error(`Falha ao consultar destinatários: ${lawyersError.message}`);
      }

      for (const lawyer of lawyers || []) {
        lawyerMap.set(lawyer.id, lawyer);
      }
    }

    const events = (funnelData || []).map((item) => {
      const lawyer = lawyerMap.get(item.user_id);
      const resolvedName =
        item.clientes?.name || lawyer?.name || "Destinatário não identificado";
      const resolvedEmail =
        item.clientes?.email || lawyer?.email || item.recipient_email || "";
      const alert = getJourneyAlert(item);

      return {
        id: item.id,
        caseId: item.case_id || null,
        emailType: item.email_type || "SISTEMA",
        recipientName: resolvedName,
        maskedEmail: maskEmail(resolvedEmail),
        interestedCount: item.interested_count || 0,
        caseTitle: item.casos?.titulo || "—",
        sentAt: item.sent_at,
        openedAt: item.opened_at,
        clickedAt: item.clicked_at,
        loggedInAt: item.logged_in_at,
        viewedInterestsAt: item.viewed_interests_at,
        respondedAt: item.responded_at,
        currentStep: getJourneyStep(item),
        lastActivityAt: getLastActivityAt(item),
        alert,
      };
    });

    return json({
      success: true,
      data: {
        events,
        summary: calculateSummary(events),
        privacy: {
          emailsMasked: true,
          rawRecipientEmailsReturned: false,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Funil][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar o funil de comunicação.",
      },
      500,
    );
  }
}
