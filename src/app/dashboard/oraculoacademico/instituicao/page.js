import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import {
  INSTITUTION_ROLE_LABELS,
  getInstitutionAccessContext,
} from "@/lib/oraculoInstitutionAccess";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

import styles from "./InstitutionDashboard.module.css";

const NAV_GROUPS = [
  {
    title: "Visao geral",
    items: [
      {
        label: "Inicio",
        href: "/dashboard/oraculoacademico/instituicao",
        permission: "INSTITUTION_VIEW_DASHBOARD",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Gestao academica",
    items: [
      {
        label: "Programas academicos",
        href: "/dashboard/oraculoacademico/instituicao/programas",
        permission: "INSTITUTION_VIEW_PROGRAMS",
        icon: BookOpen,
      },
      {
        label: "Turmas",
        href: "/dashboard/oraculoacademico/instituicao/turmas",
        permission: "INSTITUTION_VIEW_PROGRAMS",
        icon: ClipboardCheck,
      },
      {
        label: "Estudantes",
        href: "/dashboard/oraculoacademico/instituicao/estudantes",
        permission: "INSTITUTION_VIEW_STUDENTS",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Supervisao",
    items: [
      {
        label: "Supervisores",
        href: "/dashboard/oraculoacademico/instituicao/supervisores",
        permission: "PROGRAM_MANAGE_SUPERVISORS",
        icon: ShieldCheck,
      },
      {
        label: "Professores orientadores",
        href: "/dashboard/oraculoacademico/instituicao/orientadores",
        permission: "PROGRAM_MANAGE_ORIENTATORS",
        icon: UserCog,
      },
      {
        label: "Revisoes pendentes",
        href: "/dashboard/oraculoacademico/instituicao/revisoes",
        permission: "STUDENT_REVIEW_ACTIVITY",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Pratica juridica",
    items: [
      {
        label: "Atividades",
        href: "/dashboard/oraculoacademico/instituicao/atividades",
        permission: "INSTITUTION_VIEW_STUDENTS",
        icon: ClipboardCheck,
      },
      {
        label: "Carga horaria",
        href: "/dashboard/oraculoacademico/instituicao/carga-horaria",
        permission: "INSTITUTION_VIEW_METRICS",
        icon: Clock3,
      },
      {
        label: "Avaliacoes",
        href: "/dashboard/oraculoacademico/instituicao/avaliacoes",
        permission: "STUDENT_EVALUATE",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Gestao e resultados",
    items: [
      {
        label: "Relatorios",
        href: "/dashboard/oraculoacademico/instituicao/relatorios",
        permission: "INSTITUTION_VIEW_REPORTS",
        icon: FileText,
      },
      {
        label: "Impacto academico",
        href: "/dashboard/oraculoacademico/instituicao/impacto",
        permission: "INSTITUTION_VIEW_METRICS",
        icon: BarChart3,
      },
      {
        label: "Auditoria",
        href: "/dashboard/oraculoacademico/instituicao/auditoria",
        permission: "INSTITUTION_VIEW_AUDIT",
        icon: LockKeyhole,
      },
    ],
  },
  {
    title: "Administracao",
    items: [
      {
        label: "Usuarios e acessos",
        href: "/dashboard/oraculoacademico/instituicao/usuarios",
        permission: "INSTITUTION_MANAGE_USERS",
        icon: Users,
      },
      {
        label: "Instituicao",
        href: "/dashboard/oraculoacademico/instituicao/dados",
        permission: "INSTITUTION_MANAGE_PROGRAMS",
        icon: GraduationCap,
      },
      {
        label: "Documentos e compliance",
        href: "/dashboard/oraculoacademico/instituicao/documentos",
        permission: "INSTITUTION_MANAGE_PROGRAMS",
        icon: FileText,
      },
    ],
  },
];

function hasPermission(access, permission) {
  return access.permissions.includes(permission);
}

function filterNavigation(access) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(access, item.permission)),
  })).filter((group) => group.items.length > 0);
}

function greetingForNow() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function displayName(user) {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario"
  );
}

function firstRoleLabel(roles) {
  return INSTITUTION_ROLE_LABELS[roles?.[0]] || "Acesso institucional";
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

function countValue(result) {
  if (result?.error) return null;
  return typeof result?.count === "number" ? result.count : 0;
}

async function safeCount(query) {
  const result = await query;
  return countValue(result);
}

async function loadInstitutionDashboardData({ instituicaoId }) {
  const nowIso = new Date().toISOString();

  const [
    activeStudents,
    pendingStudents,
    activeUsers,
    pendingInvites,
    formalSupervisors,
    documents,
    recentAudit,
  ] = await Promise.all([
    safeCount(
      supabaseAdmin
        .from("oraculo_profissionais")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId)
        .eq("status", "ATIVO"),
    ),
    safeCount(
      supabaseAdmin
        .from("oraculo_profissionais")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId)
        .in("status", [
          "CADASTRO_INCOMPLETO",
          "PENDENTE_DOCUMENTOS",
          "PENDENTE_SUPERVISOR",
          "PENDENTE_ADMIN",
        ]),
    ),
    safeCount(
      supabaseAdmin
        .from("oraculo_instituicao_usuarios")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId)
        .eq("status", "ATIVO"),
    ),
    safeCount(
      supabaseAdmin
        .from("oraculo_instituicao_convites")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId)
        .eq("status", "PENDENTE")
        .gte("expires_at", nowIso),
    ),
    safeCount(
      supabaseAdmin
        .from("oraculo_supervisores_formais")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId),
    ),
    safeCount(
      supabaseAdmin
        .from("oraculo_instituicao_documentos")
        .select("id", { count: "exact", head: true })
        .eq("instituicao_id", instituicaoId),
    ),
    supabaseAdmin
      .from("oraculo_instituicao_user_audit_logs")
      .select("event_type, action, result, metadata, created_at")
      .eq("instituicao_id", instituicaoId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    activeStudents,
    pendingStudents,
    activeUsers,
    pendingInvites,
    formalSupervisors,
    documents,
    recentAudit: recentAudit?.error ? [] : recentAudit?.data || [],
  };
}

function metricLabel(value, fallback = "Base nao aplicada") {
  return value === null ? fallback : formatNumber(value);
}

function buildAttentionItems(metrics, access) {
  const items = [];

  if (metrics.pendingStudents > 0 && hasPermission(access, "INSTITUTION_VIEW_STUDENTS")) {
    items.push({
      level: "ATENCAO",
      text: `${metrics.pendingStudents} estudante(s) aguardando liberacao ou documentos`,
      href: "/dashboard/oraculoacademico/instituicao/estudantes?status=pendente",
      cta: "Ver estudantes",
    });
  }

  if (metrics.pendingInvites > 0 && hasPermission(access, "INSTITUTION_MANAGE_USERS")) {
    items.push({
      level: "INFO",
      text: `${metrics.pendingInvites} convite(s) institucional(is) pendente(s)`,
      href: "/dashboard/oraculoacademico/instituicao/usuarios?status=convite",
      cta: "Ver convites",
    });
  }

  if (metrics.formalSupervisors === 0 && hasPermission(access, "PROGRAM_MANAGE_SUPERVISORS")) {
    items.push({
      level: "CRITICO",
      text: "Nenhum supervisor formal cadastrado para a instituicao",
      href: "/dashboard/oraculoacademico/instituicao/supervisores",
      cta: "Cadastrar supervisor",
    });
  }

  if (metrics.documents === 0 && hasPermission(access, "INSTITUTION_MANAGE_PROGRAMS")) {
    items.push({
      level: "ATENCAO",
      text: "Nenhum documento institucional/compliance foi anexado",
      href: "/dashboard/oraculoacademico/instituicao/documentos",
      cta: "Ver documentos",
    });
  }

  if (items.length > 0) return items;

  return [
    {
      level: "INFO",
      text: "Sem pendencias institucionais criticas registradas neste momento",
      href: "/dashboard/oraculoacademico/instituicao/auditoria",
      cta: "Ver auditoria",
    },
  ];
}

function eventLabel(event) {
  const action = event.action || event.event_type || "Atividade institucional";
  const normalized = action.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function OraculoInstitutionDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/oraculoacademico/login");

  const { data: memberships } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("instituicao_id")
    .eq("auth_user_id", user.id)
    .eq("status", "ATIVO")
    .limit(1);

  const instituicaoId = memberships?.[0]?.instituicao_id;
  if (!instituicaoId) redirect("/oraculoacademico/login");

  const access = await getInstitutionAccessContext({
    authUserId: user.id,
    instituicaoId,
  });

  if (!access || !hasPermission(access, "INSTITUTION_VIEW_DASHBOARD")) {
    redirect("/oraculoacademico/login");
  }

  const [{ data: instituicao }, dashboardData] = await Promise.all([
    supabaseAdmin
      .from("oraculo_instituicoes")
      .select(
        "nome, sigla, status, nome_programa, modalidade_parceria, dominio_institucional, dominio_email, instituicao_mfa_policy",
      )
      .eq("id", instituicaoId)
      .maybeSingle(),
    loadInstitutionDashboardData({ instituicaoId }),
  ]);

  const navigation = filterNavigation(access);
  const attentionItems = buildAttentionItems(dashboardData, access);
  const userName = displayName(user);
  const roleLabel = firstRoleLabel(access.roles);
  const programName = instituicao?.nome_programa || "Programa Oraculo";
  const institutionName = instituicao?.nome || "Instituicao de ensino";
  const institutionInitials =
    instituicao?.sigla ||
    institutionName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const metrics = [
    {
      label: "Estudantes ativos",
      value: metricLabel(dashboardData.activeStudents),
      detail:
        dashboardData.pendingStudents === null
          ? "Aguardando tabela oraculo_profissionais"
          : `${formatNumber(dashboardData.pendingStudents)} aguardando liberacao`,
      href: "/dashboard/oraculoacademico/instituicao/estudantes?status=ativo",
      permission: "INSTITUTION_VIEW_STUDENTS",
    },
    {
      label: "Usuarios institucionais",
      value: metricLabel(dashboardData.activeUsers),
      detail: `${formatNumber(dashboardData.pendingInvites || 0)} convite(s) pendente(s)`,
      href: "/dashboard/oraculoacademico/instituicao/usuarios",
      permission: "INSTITUTION_MANAGE_USERS",
    },
    {
      label: "Supervisores formais",
      value: metricLabel(dashboardData.formalSupervisors),
      detail: "Vinculos institucionais cadastrados",
      href: "/dashboard/oraculoacademico/instituicao/supervisores",
      permission: "PROGRAM_MANAGE_SUPERVISORS",
    },
    {
      label: "Documentos e compliance",
      value: metricLabel(dashboardData.documents),
      detail: "Arquivos vinculados ao dossie institucional",
      href: "/dashboard/oraculoacademico/instituicao/documentos",
      permission: "INSTITUTION_MANAGE_PROGRAMS",
    },
    {
      label: "Atividades registradas",
      value: "Sem base",
      detail: "Depende da tabela academica de atividades",
      href: "/dashboard/oraculoacademico/instituicao/atividades",
      permission: "INSTITUTION_VIEW_STUDENTS",
    },
    {
      label: "Horas reconhecidas",
      value: "Sem base",
      detail: "Depende da tabela de carga horaria",
      href: "/dashboard/oraculoacademico/instituicao/carga-horaria",
      permission: "INSTITUTION_VIEW_METRICS",
    },
  ].filter((metric) => hasPermission(access, metric.permission));

  const legalAreas = [
    { label: "Direito do Consumidor", value: 0 },
    { label: "Familia", value: 0 },
    { label: "Trabalhista", value: 0 },
    { label: "Civel", value: 0 },
  ];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard/oraculoacademico/instituicao" className={styles.brand}>
          <span className={styles.brandIcon}>
            <GraduationCap size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>Oraculo</strong>
            <small>Academico</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navegacao institucional">
          {navigation.map((group) => (
            <section key={group.title} className={styles.navGroup}>
              <h2>{group.title}</h2>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={styles.navItem}>
                    <Icon size={16} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.context}>
            <span>{institutionInitials}</span>
            <div>
              <strong>{institutionName}</strong>
              <small>{programName}</small>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.programSelector}>
              <small>Programa</small>
              <strong>{programName}</strong>
            </div>
            <button className={styles.notificationButton} type="button" aria-label="Notificacoes">
              <Bell size={17} aria-hidden="true" />
              <span>{attentionItems.length}</span>
            </button>
            <div className={styles.profile}>
              <strong>{userName}</strong>
              <small>{roleLabel}</small>
            </div>
          </div>
        </header>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>{instituicao?.status || access.status}</span>
            <h1>
              {greetingForNow()}, {userName}.
            </h1>
            <p>
              Acompanhe a atividade academica, os acessos institucionais e as
              pendencias operacionais do Programa Oraculo.
            </p>
          </div>

          <div className={styles.quickActions}>
            {hasPermission(access, "INSTITUTION_MANAGE_PROGRAMS") && (
              <Link href="/dashboard/oraculoacademico/instituicao/programas/novo">
                Novo programa
              </Link>
            )}
            {hasPermission(access, "INSTITUTION_VIEW_PROGRAMS") && (
              <Link href="/dashboard/oraculoacademico/instituicao/turmas/nova">
                Criar turma
              </Link>
            )}
            {hasPermission(access, "INSTITUTION_INVITE_USERS") && (
              <Link href="/dashboard/oraculoacademico/instituicao/usuarios/convidar">
                Convidar usuario
              </Link>
            )}
            {hasPermission(access, "INSTITUTION_VIEW_REPORTS") && (
              <Link href="/dashboard/oraculoacademico/instituicao/relatorios">
                Gerar relatorio
              </Link>
            )}
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label="Indicadores principais">
          {metrics.map((metric) => (
            <Link key={metric.label} href={metric.href} className={styles.metricCard}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </Link>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>Atencao necessaria</span>
                <h2>Prioridades institucionais</h2>
              </div>
            </div>
            <div className={styles.attentionList}>
              {attentionItems.map((item) => (
                <div key={`${item.level}-${item.text}`} className={styles.attentionItem}>
                  <span className={`${styles.level} ${styles[`level${item.level}`]}`}>
                    {item.level}
                  </span>
                  <p>{item.text}</p>
                  <Link href={item.href}>{item.cta}</Link>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>Atividade recente</span>
                <h2>Registro institucional</h2>
              </div>
            </div>
            <div className={styles.activityFeed}>
              {dashboardData.recentAudit.length > 0 ? (
                dashboardData.recentAudit.map((event) => (
                  <div key={`${event.created_at}-${event.event_type}`}>
                    <time>{formatTime(event.created_at)}</time>
                    <p>{eventLabel(event)}</p>
                    <small>{event.result || "SUCCESS"}</small>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>Nenhuma atividade institucional registrada ainda.</p>
                  <small>Convites, mudancas de acesso e eventos de auditoria aparecem aqui.</small>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>Atividades registradas</span>
                <h2>Ultimos 30 dias</h2>
              </div>
              <span className={styles.pendingSchema}>Sem tabela academica</span>
            </div>
            <div className={styles.chartPlaceholder}>
              {[18, 28, 12, 36, 24, 42, 30].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  style={{ "--bar-height": `${height}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className={styles.muted}>
              O grafico sera preenchido quando a base de atividades academicas
              for criada e vinculada a instituicao/programa.
            </p>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>Distribuicao por area juridica</span>
                <h2>Casos analisados</h2>
              </div>
              <span className={styles.pendingSchema}>Sem dados sensiveis na home</span>
            </div>
            <div className={styles.areaList}>
              {legalAreas.map((area) => (
                <div key={area.label}>
                  <span>{area.label}</span>
                  <strong>{area.value}%</strong>
                  <i style={{ "--area-width": `${area.value}%` }} />
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.footerPanel}>
          <div>
            <span className={styles.kicker}>Contexto institucional</span>
            <h2>Permissoes resolvidas no servidor</h2>
            <p>
              {access.roles.map((role) => INSTITUTION_ROLE_LABELS[role] || role).join(", ") ||
                "Sem role ativa"}
            </p>
          </div>
          <dl>
            <div>
              <dt>MFA</dt>
              <dd>{access.mfaRequired ? "Obrigatorio" : "Nao obrigatorio"}</dd>
            </div>
            <div>
              <dt>Permissoes</dt>
              <dd>{formatNumber(access.permissions.length)}</dd>
            </div>
            <div>
              <dt>Escopos</dt>
              <dd>
                {access.programScopes.length > 0
                  ? formatNumber(access.programScopes.length)
                  : "Geral"}
              </dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}
