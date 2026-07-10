import {
  BookMarked,
  BookOpen,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  GraduationCap,
  Home,
  NotebookPen,
  ScrollText,
  Timer,
  UserCircle,
  UserCog,
} from "lucide-react";

// Estrutura da sidebar do Dashboard do Oráculo (estudante).
// Não usar "Oportunidades": o estudante não capta clientes. Usar "Central de Casos".
export const ORACULO_NAV_GROUPS = [
  {
    title: "Início",
    items: [{ label: "Início", href: "/dashboard/oraculo", icon: Home }],
  },
  {
    title: "Prática jurídica",
    items: [
      {
        label: "Central de Casos",
        href: "/dashboard/oraculo/casos",
        icon: FolderOpen,
      },
      {
        label: "Minhas Análises",
        href: "/dashboard/oraculo/analises",
        icon: ClipboardList,
      },
      {
        label: "Revisões e Correções",
        href: "/dashboard/oraculo/revisoes",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Estudo e pesquisa",
    items: [
      {
        label: "Biblioteca Jurídica",
        href: "/dashboard/oraculo/biblioteca",
        icon: BookOpen,
      },
      {
        label: "Meu Caderno Jurídico",
        href: "/dashboard/oraculo/caderno",
        icon: NotebookPen,
      },
    ],
  },
  {
    title: "Acompanhamento",
    items: [
      {
        label: "Meu Supervisor",
        href: "/dashboard/oraculo/supervisor",
        icon: UserCog,
      },
      {
        label: "Meu Orientador",
        href: "/dashboard/oraculo/orientador",
        icon: BookMarked,
      },
    ],
  },
  {
    title: "Minha evolução",
    items: [
      {
        label: "Minha Atividade",
        href: "/dashboard/oraculo/atividade",
        icon: GraduationCap,
      },
      {
        label: "Carga Horária",
        href: "/dashboard/oraculo/carga-horaria",
        icon: Timer,
      },
      {
        label: "Avaliações",
        href: "/dashboard/oraculo/avaliacoes",
        icon: FileBarChart,
      },
      {
        label: "Relatórios",
        href: "/dashboard/oraculo/relatorios",
        icon: FileBarChart,
      },
    ],
  },
  {
    title: "Conta",
    items: [
      {
        label: "Meu Perfil",
        href: "/dashboard/oraculo/perfil",
        icon: UserCircle,
      },
    ],
  },
];
