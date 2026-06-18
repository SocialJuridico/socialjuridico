const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("signature product authentication boundary", () => {
  const authSources = [
    "src/app/api/assinatura/auth/cadastro/route.js",
    "src/app/api/assinatura/auth/login/route.js",
    "src/app/api/assinatura/auth/ativar/route.js",
  ].map(read).join("\n");

  test("does not read platform product tables", () => {
    for (const table of ["advogados", "clientes", "admins", "escritorios"]) {
      expect(authSources).not.toMatch(new RegExp(`\\.from\\([\"']${table}[\"']\\)`));
    }
  });

  test("activates an existing identity only through the signature provisioner", () => {
    const signup = read("src/app/api/assinatura/auth/cadastro/route.js");
    const login = read("src/app/api/assinatura/auth/login/route.js");
    const activation = read("src/app/api/assinatura/auth/ativar/route.js");

    expect(signup).toContain("sendExistingSignatureActivationEmail");
    expect(signup).not.toContain('code: "ACCOUNT_ALREADY_EXISTS"');
    expect(login).toContain('code: "SIGNATURE_ACTIVATION_REQUIRED"');
    expect(login).toContain("data.user.user_metadata?.full_name");
    expect(activation).toContain("supabase.auth.getUser()");
    expect(activation).toContain("provisionSignatureAccount(supabaseAdmin");
    expect(activation).not.toContain("user_metadata:");
  });

  test("uses a verified magic link when the ecosystem password is not available", () => {
    const signatureAuth = read("src/lib/signatureAuth.js");
    const confirmation = read("src/app/api/assinatura/auth/confirmar/route.js");
    const activationPage = read("src/app/assinatura/ativar/page.js");

    expect(signatureAuth).toContain('type: "magiclink"');
    expect(confirmation).toContain('type === "magiclink"');
    expect(confirmation).toContain('new URL("/assinatura/ativar"');
    expect(activationPage).toContain('from("signature_accounts")');
  });

  test("keeps the signature session separate from the platform session", () => {
    const signatureSessionSources = [
      "src/app/api/assinatura/auth/cadastro/route.js",
      "src/app/api/assinatura/auth/login/route.js",
      "src/app/api/assinatura/auth/ativar/route.js",
      "src/app/assinatura/app/layout.js",
      "src/app/assinatura/app/page.js",
      "src/lib/signatureProductServer.js",
    ].map(read).join("\n");
    const signatureClient = read("src/lib/signatureSupabaseServer.js");
    const logoutButton = read("src/app/assinatura/app/SignatureLogoutButton.jsx");

    expect(signatureSessionSources).not.toContain('@/lib/supabaseServer');
    expect(signatureSessionSources).toContain('@/lib/signatureSupabaseServer');
    expect(signatureClient).toContain('SIGNATURE_AUTH_COOKIE_NAME = "sj-signature-auth"');
    expect(logoutButton).toContain('/api/assinatura/auth/logout');
    expect(logoutButton).not.toContain('/api/auth/logout');
  });

  test("opens the internal plan modal from every dashboard plan action", () => {
    const dashboard = read("src/app/assinatura/app/SignatureDashboardClient.jsx");

    expect(dashboard).toContain("function PlansModal");
    expect(dashboard).toContain("setPlansModalOpen(true)");
    expect(dashboard).toContain("PLAN_OPTIONS.map");
    expect(dashboard).not.toContain('href="/assinatura#planos"');
    expect(dashboard).toContain("ndi7446-essencial-assinaturas");
    expect(dashboard).toContain("ebw4403-profissional-assinaturas");
    expect(dashboard).toContain("tnh4256-negocios");
    expect(dashboard).toContain("mwd2623-assinaturas-ilimitadas");
    expect(dashboard).toContain("eir2319-certificado-blindagem");
  });
});
