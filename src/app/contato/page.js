import styles from './Contato.module.css';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';

export const metadata = {
  title: "Contato | SocialJurídico",
  description: "Entre em contato com a equipe do SocialJurídico. Estamos prontos para ajudar.",
};

export default function Contato() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        <header className={styles.header}>
          <h1 className={styles.title}>Fale Conosco</h1>
          <p className={styles.subtitle}>
            Dúvidas, sugestões ou suporte? Nossa equipe técnica e jurídica está à disposição para te ouvir.
          </p>
        </header>

        <div className={styles.grid}>
          
          {/* Info Side */}
          <aside className={styles.infoCard}>
            <h2 className={styles.infoTitle}>Informações de Contato</h2>
            <div className={styles.contactItems}>
              
              <div className={styles.contactItem}>
                <div className={styles.iconWrapper}>
                  <Mail size={24} />
                </div>
                <div className={styles.itemText}>
                  <h4>E-mail</h4>
                  <p>contato@socialjuridico.com.br</p>
                  <p>suporte@socialjuridico.com.br</p>
                </div>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.iconWrapper}>
                  <MessageCircle size={24} />
                </div>
                <div className={styles.itemText}>
                  <h4>WhatsApp</h4>
                  <p>+55 (11) 99999-9999</p>
                  <p>Seg à Sex, 09h às 18h</p>
                </div>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.iconWrapper}>
                  <MapPin size={24} />
                </div>
                <div className={styles.itemText}>
                  <h4>Escritório</h4>
                  <p>Av. Paulista, 1000 - Bela Vista</p>
                  <p>São Paulo - SP, 01310-100</p>
                </div>
              </div>

            </div>
          </aside>

          {/* Form Side */}
          <section className={styles.formBox}>
            <form>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome Completo</label>
                <input type="text" className={styles.input} placeholder="Como podemos te chamar?" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>E-mail Corporativo</label>
                <input type="email" className={styles.input} placeholder="seu@email.com" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Assunto</label>
                <select className={styles.input} required defaultValue="">
                  <option value="" disabled>Selecione um assunto</option>
                  <option value="suporte">Suporte Técnico</option>
                  <option value="financeiro">Financeiro / Pagamentos</option>
                  <option value="parcerias">Parcerias / Imprensa</option>
                  <option value="lgpd">Privacidade / LGPD</option>
                  <option value="outro">Outros Assuntos</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mensagem</label>
                <textarea className={styles.textarea} placeholder="Descreva sua solicitação com detalhes..." required></textarea>
              </div>

              <button type="submit" className={styles.submitBtn}>
                Enviar Mensagem
                <Send size={20} />
              </button>
            </form>
          </section>

        </div>

      </div>
    </main>
  );
}
