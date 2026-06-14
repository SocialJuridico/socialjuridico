import {
  matchesExtrajudicialNotificationFilters,
  normalizeNotificationQuery,
  normalizeNotificationStatus,
  serializeExtrajudicialNotification,
} from "./extrajudicialNotificationValidation";

describe("extrajudicial notification validation", () => {
  test("normaliza paginação, busca e status", () => {
    const params = new URLSearchParams({
      page: "0",
      pageSize: "200",
      search: "  NTF123  ",
      status: "LIDO",
    });

    expect(normalizeNotificationQuery(params)).toEqual({
      page: 1,
      pageSize: 30,
      search: "ntf123",
      status: "lido",
    });
  });

  test("normaliza estados históricos", () => {
    expect(normalizeNotificationStatus("visualizado")).toBe("lido");
    expect(normalizeNotificationStatus("falhou")).toBe("erro_envio");
    expect(normalizeNotificationStatus(null)).toBe("enviado");
  });

  test("serializa sem expor URL pública do storage", () => {
    const notification = serializeExtrajudicialNotification(
      {
        id: "11111111-1111-4111-8111-111111111111",
        lawyer_id: "22222222-2222-4222-8222-222222222222",
        client_id: "33333333-3333-4333-8333-333333333333",
        protocol: "NTFABC123",
        status: "lido",
        destinatario_email: "destinatario@example.com",
        file_name: "notificacao.pdf",
        file_url:
          "https://example.supabase.co/storage/v1/object/public/crm_documents/blindagem/notificacao/a.pdf",
        access_token: "token-secreto",
        hash_sha512: "a".repeat(128),
        read_at: "2026-06-13T12:00:00.000Z",
        read_geo: "-29.000,-51.000",
      },
      {
        memberMap: new Map([
          ["22222222-2222-4222-8222-222222222222", { name: "Dra. Ana" }],
        ]),
        clientMap: new Map([
          ["33333333-3333-4333-8333-333333333333", { name: "Cliente" }],
        ]),
      },
    );

    expect(notification.status).toBe("lido");
    expect(notification.lawyerName).toBe("Dra. Ana");
    expect(notification.clientName).toBe("Cliente");
    expect(notification.hasLocation).toBe(true);
    expect(notification.documentUrl).toBe(
      "/api/advogado/notificacaoextrajudicial/11111111-1111-4111-8111-111111111111/arquivo",
    );
    expect(JSON.stringify(notification)).not.toContain("supabase.co");
  });

  test("filtra por status, protocolo e destinatário", () => {
    const item = {
      status: "lido",
      protocol: "NTFABC123",
      recipientEmail: "maria@example.com",
      fileName: "notificacao.pdf",
      clientName: "Maria",
      lawyerName: "Dr. João",
    };

    expect(
      matchesExtrajudicialNotificationFilters(item, {
        status: "lido",
        search: "abc123",
      }),
    ).toBe(true);
    expect(
      matchesExtrajudicialNotificationFilters(item, {
        status: "enviado",
        search: "maria",
      }),
    ).toBe(false);
  });
});
