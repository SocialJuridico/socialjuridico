const fs = require("fs");
const path = require("path");

const migrationPath = path.join(
  process.cwd(),
  "database",
  "migrations",
  "20260617_signature_saas_accounts.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8").toLowerCase();

describe("signature SaaS accounts migration", () => {
  test("creates isolated account and tenancy tables", () => {
    expect(sql).toContain("create table if not exists public.signature_accounts");
    expect(sql).toContain("create table if not exists public.signature_organizations");
    expect(sql).toContain("create table if not exists public.signature_organization_members");
    expect(sql).toContain("create table if not exists public.signature_subscriptions");
    expect(sql).toContain("create table if not exists public.signature_usage_periods");
  });

  test("enables RLS and restricts mutations to the backend", () => {
    expect(sql).toContain("alter table public.signature_accounts enable row level security");
    expect(sql).toContain("alter table public.signature_organizations enable row level security");
    expect(sql).toContain("revoke all on table public.signature_accounts from anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.signature_accounts to service_role");
    expect(sql).toContain("signature_organizations_read_member");
  });

  test("encodes the commercial limits", () => {
    expect(sql).toContain("plan_code = 'free' and documents_limit = 3");
    expect(sql).toContain("plan_code = 'essential' and documents_limit = 10");
    expect(sql).toContain("plan_code = 'professional' and documents_limit = 50");
    expect(sql).toContain("plan_code = 'business' and documents_limit = 100");
    expect(sql).toContain("plan_code = 'unlimited' and documents_limit is null");
  });

  test("provisions the free account idempotently and protects audit history", () => {
    expect(sql).toContain("create or replace function public.provision_signature_account");
    expect(sql).toContain("on conflict (user_id) do update");
    expect(sql).toContain("signature_account_audit_logs is append-only");
    expect(sql).toContain("grant execute on function public.provision_signature_account");
    expect(sql).toContain("owner_user_id uuid not null references auth.users(id) on delete cascade");
  });
});
