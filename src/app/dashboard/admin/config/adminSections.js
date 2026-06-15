import {
  Bell,
  BookOpen,
  Building,
  DollarSign,
  FileText,
  Film,
  Image as ImageIcon,
  Mail,
  Megaphone,
  MessageSquare,
  Scale,
  Shield,
  Star,
  Ticket,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

export const ADMIN_CARD_TONES = {
  default: "default",
  gold: "gold",
  blue: "blue",
  cyan: "cyan",
  green: "green",
  purple: "purple",
  orange: "orange",
  red: "red",
};

export function createAdminSections(stats) {
  const radarPending = stats.totalRadarPendente || 0;

  return [
    {
      id: "users",
      title: "Usuários & Perfis",
      icon: Users,
      cards: [
        { title: "Clientes", value: stats.totalClientes, href: "/dashboard/admin/clientes", icon: Users },
        { title: "Advogados", value: stats.totalAdvogados, href: "/dashboard/admin/advogados", icon: Scale },
        { title: "Escritórios Enterprise", value: "Gerenciar", href: "/dashboard/admin/escritorios", icon: Building, tone: ADMIN_CARD_TONES.cyan },
        { title: "Administradores", value: "Gerenciar", href: "/dashboard/admin/admins", icon: UserCog },
        { title: "Avaliações de casos", value: "Ver notas", href: "/dashboard/admin/avaliacoes", icon: Star, tone: ADMIN_CARD_TONES.gold },
        { title: "Pesquisas da plataforma", value: "Gerenciar", href: "/dashboard/admin/pesquisas", icon: Star, tone: ADMIN_CARD_TONES.gold },
      ],
    },
    {
      id: "communication",
      title: "Comunicação & Marketing",
      icon: Megaphone,
      cards: [
        { title: "Avisos internos", value: "Dashboard do advogado", href: "/dashboard/admin/push", icon: Megaphone, tone: ADMIN_CARD_TONES.blue },
        { title: "Minhas mensagens", value: "Recebidas", href: "/dashboard/admin/notificacoes", icon: Bell },
        { title: "Notificações geradas", value: stats.totalNotificacoes, href: "/dashboard/admin/comunicados", icon: Bell },
        { title: "Mensagens de casos", value: "Conversas", href: "/dashboard/admin/mensagens", icon: MessageSquare },
      ],
    },
    {
      id: "operations",
      title: "Operacional & Financeiro",
      icon: FileText,
      cards: [
        { title: "Gestão de casos", value: stats.totalCasos, href: "/dashboard/admin/casos", icon: FileText },
        { title: "Gestão financeira", value: "Ver vendas", href: "/dashboard/admin/transacoes", icon: DollarSign, tone: ADMIN_CARD_TONES.green },
        { title: "Anunciantes de serviços", value: "Gerenciar", href: "/dashboard/admin/anunciantes", icon: Megaphone, tone: ADMIN_CARD_TONES.purple },
        { title: "Gestão de afiliados", value: "Ver indicações", href: "/dashboard/admin/afiliados", icon: Scale, tone: ADMIN_CARD_TONES.gold },
      ],
    },
    {
      id: "reports",
      title: "Relatórios & Auditoria",
      icon: FileText,
      cards: [
        { title: "Relatórios de uso", value: "Métricas, PDF e histórico", href: "/dashboard/admin/relatorios", icon: FileText, tone: ADMIN_CARD_TONES.gold },
        { title: "Funil de reengajamento", value: "Ver métricas e conversões", href: "/dashboard/admin/casos?tab=FUNNEL", icon: Mail, tone: ADMIN_CARD_TONES.gold },
      ],
    },
    {
      id: "system",
      title: "Sistema & Configurações",
      icon: Shield,
      cards: [
        { title: "Documentação", value: "PDF, IA e publicação", href: "/dashboard/admin/documentacao", icon: BookOpen, tone: ADMIN_CARD_TONES.gold },
        { title: "Tutoriais", value: "Vídeos por rota e perfil", href: "/dashboard/admin/tutoriais", icon: Film, tone: ADMIN_CARD_TONES.purple },
        { title: "Banners do App", value: "Publicação, agenda e rotação", href: "/dashboard/admin/banners", icon: ImageIcon, tone: ADMIN_CARD_TONES.gold },
        { title: "Advogado do mês", value: "Gerenciar popup", href: "/dashboard/admin/advogado-mes", icon: Star, tone: ADMIN_CARD_TONES.gold },
        { title: "Gestão de cupons", value: "Gerenciar", href: "/dashboard/admin/cupons", icon: Ticket, tone: ADMIN_CARD_TONES.green },
        { title: "LGPD: Exclusões", value: "Ver pedidos", href: "/dashboard/admin/solicitacoes-exclusao", icon: Trash2, tone: ADMIN_CARD_TONES.red },
        {
          title: "Radar Jurídico",
          value: radarPending > 0 ? `${radarPending} pendente${radarPending !== 1 ? "s" : ""}` : "Sem pendências",
          href: "/dashboard/admin/radar",
          icon: Shield,
          tone: ADMIN_CARD_TONES.cyan,
          highlighted: radarPending > 0,
        },
      ],
    },
  ];
}
