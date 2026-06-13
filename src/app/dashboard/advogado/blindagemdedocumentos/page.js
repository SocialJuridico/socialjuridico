import DocumentProtectionDashboard from "./components/DocumentProtectionDashboard";

export const metadata = {
  title: "Blindagem de Documentos | Social Jurídico",
  description:
    "Registre a integridade de documentos com hash SHA-512, armazenamento privado e download autenticado.",
};

export default function DocumentProtectionPage() {
  return <DocumentProtectionDashboard />;
}
