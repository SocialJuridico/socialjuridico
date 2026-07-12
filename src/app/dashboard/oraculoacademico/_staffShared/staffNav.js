import { Home, MessageCircleQuestion, Users, GraduationCap, ShieldAlert, FileText } from "lucide-react";

// Navegação dos dashboards de Supervisor Jurídico / Professor Orientador.
// Escopo desta fase: home + acompanhamento + perguntas dos alunos + alertas.
export function getStaffNavGroups(role) {
  if (role === "ORACULO_SUPERVISOR_JURIDICO") {
    return [
      {
        title: "Início",
        items: [{ label: "Início", href: "/dashboard/oraculoacademico/supervisor", icon: Home }],
      },
      {
        title: "Acompanhamento",
        items: [
          {
            label: "Alunos Supervisionados",
            href: "/dashboard/oraculoacademico/supervisor/alunos",
            icon: Users,
          },
        ],
      },
      {
        title: "Conduta",
        items: [
          {
            label: "Alertas do Anjo",
            href: "/dashboard/oraculoacademico/supervisor/alertas",
            icon: ShieldAlert,
          },
          {
            label: "Relatórios de Conduta",
            href: "/dashboard/oraculoacademico/supervisor/relatorios-conduta",
            icon: FileText,
          },
        ],
      },
      {
        title: "Dúvidas",
        items: [
          {
            label: "Perguntas dos Alunos",
            href: "/dashboard/oraculoacademico/supervisor/perguntas",
            icon: MessageCircleQuestion,
          },
        ],
      },
    ];
  }

  return [
    {
      title: "Início",
      items: [{ label: "Início", href: "/dashboard/oraculoacademico/orientador", icon: Home }],
    },
    {
      title: "Acompanhamento",
      items: [
        {
          label: "Turmas",
          href: "/dashboard/oraculoacademico/orientador/turmas",
          icon: GraduationCap,
        },
        {
          label: "Alunos",
          href: "/dashboard/oraculoacademico/orientador/alunos",
          icon: Users,
        },
      ],
    },
    {
      title: "Avaliação",
      items: [
        {
          label: "Relatórios de Conduta",
          href: "/dashboard/oraculoacademico/orientador/relatorios-conduta",
          icon: FileText,
        },
      ],
    },
    {
      title: "Dúvidas",
      items: [
        {
          label: "Perguntas dos Alunos",
          href: "/dashboard/oraculoacademico/orientador/perguntas",
          icon: MessageCircleQuestion,
        },
      ],
    },
  ];
}
