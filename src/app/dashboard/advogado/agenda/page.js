import AgendaDashboard from "./components/AgendaDashboard";

export const metadata = {
  title: "Agenda & Prazos | Social Jurídico",
  description:
    "Organize prazos, audiências, reuniões e tarefas jurídicas com responsáveis, auditoria e sincronização opcional com o Google Calendar.",
};

export default function LawyerAgendaPage() {
  return <AgendaDashboard />;
}
