import { prepareAgendaPatchRequest } from "./agendaRequest";

describe("agenda patch request governance", () => {
  test("adds a one-hour end time for legacy date-only updates", async () => {
    const request = new Request("http://localhost/api/crm/agenda", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111",
        date: "2026-06-16T12:00:00.000Z",
      }),
    });

    const prepared = await prepareAgendaPatchRequest(request);
    expect(prepared.response).toBeUndefined();
    const body = await prepared.request.json();
    expect(body.endDate).toBe("2026-06-16T13:00:00.000Z");
  });

  test("rejects end-only updates and invalid intervals", async () => {
    const endOnly = new Request("http://localhost/api/advogado/agenda/item", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: "2026-06-16T13:00:00.000Z" }),
    });
    const endOnlyResult = await prepareAgendaPatchRequest(endOnly);
    expect(endOnlyResult.response.status).toBe(400);

    const inverted = new Request("http://localhost/api/advogado/agenda/item", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-06-16T14:00:00.000Z",
        endDate: "2026-06-16T13:00:00.000Z",
      }),
    });
    const invertedResult = await prepareAgendaPatchRequest(inverted);
    expect(invertedResult.response.status).toBe(400);
  });
});
