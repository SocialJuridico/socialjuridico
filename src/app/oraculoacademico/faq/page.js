import { HelpCircle } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Perguntas Frequentes" };

const FAQ_ITEMS = [
  {
    question: "Quem pode se cadastrar no Oráculo Acadêmico?",
    answer:
      "Estudantes de Direito a partir do 8º período e estagiários inscritos na OAB.",
  },
  {
    question: "Preciso ter um advogado supervisor para me cadastrar?",
    answer:
      "Sim. Você indica de 1 a 3 advogados no cadastro; pelo menos um precisa confirmar o convite para seu acesso ser liberado.",
  },
  {
    question: "Quanto tempo leva para o acesso ser liberado?",
    answer:
      "Depende de duas coisas em paralelo: a validação do seu documento pela equipe do admin e a confirmação de pelo menos um supervisor. Assim que ambos ocorrerem, o acesso é liberado automaticamente.",
  },
  {
    question: "O que acontece se meu documento for reprovado?",
    answer:
      "Você recebe um e-mail com o motivo da reprovação. É possível entrar em contato com nossa equipe para entender os próximos passos.",
  },
  {
    question: "Meu supervisor precisa ter conta na plataforma?",
    answer:
      "Não. O convite é enviado por e-mail e o supervisor responde diretamente pelo link, sem precisar criar conta.",
  },
  {
    question: "Já sou advogado com OAB, posso participar?",
    answer:
      "O Oráculo Acadêmico é destinado a quem ainda não tem OAB de advogado. Se você já é advogado, o cadastro te direciona para a área de advogados do Social Jurídico.",
  },
];

export default function FaqPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <HelpCircle size={15} aria-hidden="true" />
            Perguntas Frequentes
          </span>
          <h1 className={styles.heroTitle}>Tire suas dúvidas sobre o programa.</h1>
        </div>
      </section>

      <section className={styles.section}>
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className={styles.faqItem}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
