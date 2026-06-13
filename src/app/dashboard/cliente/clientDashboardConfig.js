import {
  Bell,
  FileText,
  Folder,
  Globe,
  Home,
  MessageSquare,
  PlusCircle,
  Scale,
  User,
} from "lucide-react";

export const CLIENT_TABS = [
  { id: "painel", label: "Visão geral", shortLabel: "Início", icon: Home },
  { id: "novo", label: "Novo caso", shortLabel: "Novo", icon: PlusCircle },
  { id: "meus-casos", label: "Meus casos", shortLabel: "Casos", icon: Folder },
  {
    id: "profissionais",
    label: "Encontrar advogado",
    shortLabel: "Advogados",
    icon: Scale,
  },
  {
    id: "conversas",
    label: "Conversas",
    shortLabel: "Conversas",
    icon: MessageSquare,
  },
  {
    id: "notificacoes",
    label: "Notificações",
    shortLabel: "Alertas",
    icon: Bell,
  },
  { id: "perfil", label: "Meu perfil", shortLabel: "Perfil", icon: User },
  {
    id: "links-uteis",
    label: "Links úteis",
    shortLabel: "Links",
    icon: Globe,
  },
];

export const CLIENT_TAB_META = Object.fromEntries(
  CLIENT_TABS.map((item) => [item.id, item]),
);

export const CASE_AREAS = [
  ["Civil", "Direito Civil"],
  ["Trabalhista", "Direito Trabalhista"],
  ["Penal", "Direito Penal"],
  ["Familia", "Direito de Família"],
  ["Consumidor", "Direito do Consumidor"],
  ["Previdenciario", "Direito Previdenciário"],
  ["Empresarial", "Direito Empresarial"],
  ["Tributario", "Direito Tributário"],
  ["Nao sei", "Não sei a área"],
  ["Outros", "Outros"],
];

export const BRAZIL_STATES = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
];

export const USEFUL_LINKS = [
  {
    title: "ConfirmaAdv",
    description: "Consulta pública de dados da advocacia.",
    href: "https://confirmadv.oab.org.br/",
  },
  {
    title: "Receita Federal",
    description: "Portal oficial da Receita Federal do Brasil.",
    href: "https://www.gov.br/receitafederal/pt-br",
  },
  {
    title: "e-CAC",
    description: "Centro Virtual de Atendimento ao Contribuinte.",
    href: "https://cav.receita.fazenda.gov.br/",
  },
  {
    title: "CNJ",
    description: "Serviços e informações do Conselho Nacional de Justiça.",
    href: "https://www.cnj.jus.br/",
  },
  {
    title: "TST",
    description: "Portal do Tribunal Superior do Trabalho.",
    href: "https://www.tst.jus.br/",
  },
  {
    title: "Central Registradores",
    description: "Serviços digitais e certidões dos registradores.",
    href: "https://www.registradores.org.br/",
  },
  {
    title: "Consulta Geral de Processos",
    description: "Busca pública ampla para acompanhamento processual.",
    href: "https://www.jusbrasil.com.br/consulta-processual/",
  },
];

export const CASE_STATUS_META = {
  ABERTO: { label: "Publicado", tone: "open" },
  NEGOCIANDO: { label: "Em negociação", tone: "negotiating" },
  CONTRATADO: { label: "Advogado contratado", tone: "hired" },
  EM_ANDAMENTO: { label: "Em andamento", tone: "hired" },
  FECHADO: { label: "Finalizado", tone: "closed" },
  CANCELADO: { label: "Cancelado", tone: "cancelled" },
};

export const NOTIFICATION_ICONS = {
  CHAT: MessageSquare,
  MENSAGEM: MessageSquare,
  CASE: FileText,
  CASO: FileText,
};

export const FACEBOOK_GROUP_URL =
  "https://www.facebook.com/groups/1667675480204134";
