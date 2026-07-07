import { SITE_NAME } from "@/lib/seo";

import OraculoHeader from "./components/OraculoHeader";
import OraculoFooter from "./components/OraculoFooter";

export const metadata = {
  title: {
    default: "Oráculo Acadêmico | Prática Jurídica Supervisionada",
    template: `%s | Oráculo Acadêmico`,
  },
  description:
    "Programa de prática jurídica supervisionada do ecossistema Social Jurídico: estudantes de Direito atuam sob a supervisão de advogados padrinhos, com validação e auditoria.",
  applicationName: `Oráculo Acadêmico | ${SITE_NAME}`,
};

export default function OraculoAcademicoLayout({ children }) {
  return (
    <>
      <OraculoHeader />
      {children}
      <OraculoFooter />
    </>
  );
}
