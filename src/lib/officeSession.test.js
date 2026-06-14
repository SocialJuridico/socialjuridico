import {
  decodeOfficeSessionValue,
  signOfficeSessionValue,
  verifyOfficeSessionValue,
} from "./officeSession";

describe("signed office session", () => {
  const previousSecret = process.env.OFFICE_SESSION_SECRET;

  beforeEach(() => {
    process.env.OFFICE_SESSION_SECRET = "agenda-office-test-secret";
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.OFFICE_SESSION_SECRET;
    else process.env.OFFICE_SESSION_SECRET = previousSecret;
  });

  test("signs and verifies the legacy payload without exposing the secret", () => {
    const value = Buffer.from(
      JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111",
        email: "office@example.com",
        role: "ESCRITORIO",
      }),
    ).toString("base64");
    const signature = signOfficeSessionValue(value);
    expect(signature).toBeTruthy();
    expect(verifyOfficeSessionValue(value, signature)).toBe(true);
    expect(decodeOfficeSessionValue(value)?.email).toBe("office@example.com");
  });

  test("rejects tampered and unsigned sessions", () => {
    const value = Buffer.from(
      JSON.stringify({ id: "office", email: "office@example.com", role: "ESCRITORIO" }),
    ).toString("base64");
    const signature = signOfficeSessionValue(value);
    expect(verifyOfficeSessionValue(`${value}x`, signature)).toBe(false);
    expect(verifyOfficeSessionValue(value, "")).toBe(false);
  });
});
