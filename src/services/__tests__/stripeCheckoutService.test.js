import {
  buildDashboardReturnUrl,
  getDashboardReturnPath,
} from "../stripeCheckoutService";

describe("Stripe dashboard return URL", () => {
  test("preserves the SmartDoc route", () => {
    const location = {
      origin: "https://www.socialjuridico.com.br",
      pathname: "/dashboard/advogado/smartdoc",
      search: "",
    };
    expect(getDashboardReturnPath(location)).toBe(
      "/dashboard/advogado/smartdoc",
    );
    expect(
      buildDashboardReturnUrl("success", "payment_status", location),
    ).toBe(
      "https://www.socialjuridico.com.br/dashboard/advogado/smartdoc?payment_status=success",
    );
  });

  test("preserves unrelated query parameters and replaces payment status", () => {
    const location = {
      origin: "https://www.socialjuridico.com.br",
      pathname: "/dashboard/advogado/smartdoc",
      search: "?juris=buy&payment=old&payment_status=failed",
    };
    expect(buildDashboardReturnUrl("success", "payment", location)).toBe(
      "https://www.socialjuridico.com.br/dashboard/advogado/smartdoc?juris=buy&payment=success",
    );
  });

  test("falls back when current path is outside the lawyer dashboard", () => {
    const location = {
      origin: "https://www.socialjuridico.com.br",
      pathname: "/login",
      search: "?redirect=external",
    };
    expect(buildDashboardReturnUrl("canceled", "payment", location)).toBe(
      "https://www.socialjuridico.com.br/dashboard/advogado/oportunidade?redirect=external&payment=canceled",
    );
  });
});
