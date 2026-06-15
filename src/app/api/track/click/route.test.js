import { isPublicDestination } from "./route";

describe("track click public destinations", () => {
  test("allows public extrajudicial notification links without login", () => {
    expect(
      isPublicDestination(
        "https://socialjuridico.com.br/notificacao/a6dd44dd-6975-438d-a5d7-20b82c9347d4",
      ),
    ).toBe(true);
  });

  test("allows public document signature links without login", () => {
    expect(
      isPublicDestination(
        "https://socialjuridico.com.br/assinatura/07e745f4-c23b-4a98-8710-44250902d058?role=client",
      ),
    ).toBe(true);
  });

  test("keeps protected dashboard links behind login", () => {
    expect(
      isPublicDestination("https://socialjuridico.com.br/dashboard/cliente"),
    ).toBe(false);
  });

  test("rejects public-looking paths on untrusted domains", () => {
    expect(
      isPublicDestination("https://evil.example/notificacao/token"),
    ).toBe(false);
  });
});
