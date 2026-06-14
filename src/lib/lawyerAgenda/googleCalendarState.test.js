import {
  createGoogleCalendarState,
  normalizeGoogleRedirect,
  verifyGoogleCalendarState,
} from "./googleCalendarState";

describe("Google Calendar OAuth state", () => {
  const previousSecret = process.env.GOOGLE_OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = "agenda-google-test-secret";
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.GOOGLE_OAUTH_STATE_SECRET;
    else process.env.GOOGLE_OAUTH_STATE_SECRET = previousSecret;
  });

  test("binds the callback to the authenticated user, nonce and safe redirect", () => {
    const { state, nonce } = createGoogleCalendarState(
      "11111111-1111-4111-8111-111111111111",
      "/dashboard/advogado/agenda",
    );
    const decoded = verifyGoogleCalendarState(state, nonce);
    expect(decoded).toMatchObject({
      userId: "11111111-1111-4111-8111-111111111111",
      redirectTo: "/dashboard/advogado/agenda",
    });
  });

  test("rejects tampering, nonce mismatch and open redirects", () => {
    const { state, nonce } = createGoogleCalendarState("user-id", "https://evil.example");
    expect(verifyGoogleCalendarState(`${state}tampered`, nonce)).toBeNull();
    expect(verifyGoogleCalendarState(state, "wrong-nonce")).toBeNull();
    expect(normalizeGoogleRedirect("https://evil.example")).toBe(
      "/dashboard/advogado/agenda",
    );
  });
});
