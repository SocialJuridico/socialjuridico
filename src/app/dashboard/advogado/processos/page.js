import LawyerProcessesDashboard from "./components/LawyerProcessesDashboard";

export const metadata = {
  title: "Processos | Social Jurídico",
  description:
    "Importação de processos judiciais via DataJud/CNJ com pasta processual vinculada ao CRM.",
};

export default function LawyerProcessesPage() {
  return <LawyerProcessesDashboard />;
}
