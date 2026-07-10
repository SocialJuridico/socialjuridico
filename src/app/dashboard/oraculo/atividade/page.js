import OraculoPlaceholder from "../OraculoPlaceholder";

export const metadata = { title: "Minha Atividade — Oráculo Acadêmico" };

export default function OraculoAtividadePage() {
  return (
    <OraculoPlaceholder
      kicker="Minha evolução"
      title="Minha Atividade"
      description="Linha do tempo das atividades acadêmicas estruturadas que você registrou."
      phase="Fase 2: timeline de atividades estruturadas (pesquisa, análise, entrevista, correção)."
    />
  );
}
