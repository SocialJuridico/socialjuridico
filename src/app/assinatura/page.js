import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSignature,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  MailCheck,
  PackageCheck,
  QrCode,
  Scale,
  ScanSearch,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { SITE_URL } from "@/lib/seo";
import styles from "./page.module.css";

const pageUrl = `${SITE_URL}/assinatura`;

export const metadata = {
  title: "Assinatura Eletrônica Segura para Empresas e Profissionais",
  description:
    "Envie documentos para assinatura eletrônica, acompanhe cada etapa e preserve evidências de autoria, integridade e conclusão em uma cadeia de custódia auditável.",
  keywords: [
    "assinatura eletrônica",
    "assinar documento online",
    "assinatura digital online",
    "plataforma de assinatura eletrônica",
    "assinatura de contrato online",
    "cadeia de custódia digital",
    "validar documento assinado",
  ],
  alternates: { canonical: "/assinatura" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Social Jurídico Assinatura | Confiança em cada documento",
    description:
      "Assine, acompanhe e valide documentos online com cadeia de custódia e trilha de auditoria.",
    url: "/assinatura",
    siteName: "Social Jurídico Assinatura",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Jurídico Assinatura",
    description:
      "Assinatura eletrônica com evidências, rastreabilidade e validação.",
  },
};

const benefits = [
  {
    icon: Fingerprint,
    title: "Evidências de identidade",
    text: "Registre os dados de autenticação e os eventos associados a cada signatário.",
  },
  {
    icon: FileCheck2,
    title: "Integridade do documento",
    text: "Preserve o vínculo entre o arquivo assinado, suas evidências e o histórico do processo.",
  },
  {
    icon: Clock3,
    title: "Linha do tempo completa",
    text: "Acompanhe envio, acesso, autenticação e conclusão em uma trilha cronológica.",
  },
  {
    icon: ScanSearch,
    title: "Validação independente",
    text: "Consulte a autenticidade e os dados do documento por código ou QR Code.",
  },
  {
    icon: UsersRound,
    title: "Múltiplos signatários",
    text: "Organize assinaturas de clientes, parceiros e equipes no mesmo fluxo.",
  },
  {
    icon: LockKeyhole,
    title: "Acesso protegido",
    text: "Convites individuais e autenticação adicional para reduzir acessos indevidos.",
  },
];

const plans = [
  {
    name: "Gratuito",
    description: "Para conhecer a plataforma e assinar sem compromisso.",
    price: "R$ 0",
    period: "/mês",
    documents: "3 documentos por mês",
    certificates: "Fluxo completo de assinatura",
    action: "Comece gratuitamente",
    featured: true,
  },
  {
    name: "Essencial",
    description: "Para profissionais com uma rotina recorrente de documentos.",
    price: "R$ 10",
    period: "/mês",
    documents: "10 documentos por mês",
    certificates: "10 certificados de blindagem",
    action: "Escolher Essencial",
  },
  {
    name: "Profissional",
    description: "Para operações que precisam de mais volume e controle.",
    price: "R$ 45",
    period: "/mês",
    documents: "50 documentos por mês",
    certificates: "50 certificados de blindagem",
    action: "Escolher Profissional",
  },
  {
    name: "Negócios",
    description: "Para equipes com alto fluxo mensal de assinaturas.",
    price: "R$ 85",
    period: "/mês",
    documents: "100 documentos por mês",
    certificates: "100 certificados de blindagem",
    action: "Escolher Negócios",
  },
];

const faqs = [
  {
    question: "O signatário precisa criar uma conta?",
    answer:
      "Não. Ele pode receber um convite individual e concluir a assinatura pelo navegador, conforme as regras de autenticação definidas para o documento.",
  },
  {
    question: "É possível acompanhar quem já assinou?",
    answer:
      "Sim. O responsável acompanha o andamento do documento e os eventos registrados durante todo o fluxo de assinatura.",
  },
  {
    question: "Como a autenticidade do documento pode ser consultada?",
    answer:
      "O documento concluído pode ser associado a um código de validação e QR Code para consulta das evidências e da integridade registradas pela plataforma.",
  },
  {
    question: "Posso usar em contratos e documentos profissionais?",
    answer:
      "A plataforma é projetada para diferentes documentos e relações privadas. O método de assinatura e autenticação deve ser escolhido conforme o risco e as exigências de cada operação.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Social Jurídico Assinatura",
    url: pageUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "pt-BR",
    description:
      "Plataforma de assinatura eletrônica com cadeia de custódia, trilha de auditoria e validação de documentos.",
    provider: { "@id": `${SITE_URL}/#organization` },
    featureList: [
      "Assinatura eletrônica de documentos",
      "Múltiplos signatários",
      "Autenticação por código",
      "Trilha de auditoria",
      "Cadeia de custódia digital",
      "Validação por código e QR Code",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

function JsonLd() {
  return structuredData.map((data, index) => (
    <script
      key={index}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  ));
}

export default function AssinaturaLandingPage() {
  return (
    <div className={styles.page}>
      <JsonLd />

      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/assinatura" className={styles.brand} aria-label="Social Jurídico Assinatura">
            <span className={styles.brandIcon} aria-hidden="true">
              <Scale size={24} strokeWidth={2.2} />
            </span>
            <span className={styles.brandName}>Social Jurídico</span>
            <span className={styles.productName}>Assinatura</span>
          </Link>

          <nav className={styles.navLinks} aria-label="Navegação do produto de assinatura">
            <Link href="#como-funciona">Como funciona</Link>
            <Link href="#seguranca">Segurança</Link>
            <Link href="#recursos">Recursos</Link>
            <Link href="#planos">Planos</Link>
            <Link href="#duvidas">Dúvidas</Link>
          </nav>

          <Link href="/contato?assunto=assinatura" className={styles.headerAction}>
            Comece gratuitamente
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div>
        <section className={styles.hero} aria-labelledby="signature-hero-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <ShieldCheck size={16} aria-hidden="true" />
                Confiança para acordos que importam
              </div>

              <h1 id="signature-hero-title">
                Assine documentos online com <span>evidências em cada etapa.</span>
              </h1>

              <p className={styles.heroText}>
                Envie, acompanhe e valide assinaturas eletrônicas em um fluxo
                simples, protegido e construído para preservar a cadeia de
                custódia do documento.
              </p>

              <div className={styles.heroActions}>
                <Link href="/contato?assunto=assinatura" className={styles.primaryAction}>
                  Comece gratuitamente
                  <ArrowRight size={19} aria-hidden="true" />
                </Link>
                <Link href="#como-funciona" className={styles.secondaryAction}>
                  Ver como funciona
                </Link>
              </div>

              <ul className={styles.trustList} aria-label="Benefícios principais">
                <li><Check size={15} aria-hidden="true" /> Sem instalação</li>
                <li><Check size={15} aria-hidden="true" /> Fluxo pelo navegador</li>
                <li><Check size={15} aria-hidden="true" /> Auditoria rastreável</li>
              </ul>
            </div>

            <div className={styles.productVisual} aria-label="Exemplo do fluxo de assinatura eletrônica">
              <div className={styles.visualTopbar}>
                <span className={styles.visualBrand}>
                  <FileSignature size={17} aria-hidden="true" />
                  Documento para assinatura
                </span>
                <span className={styles.secureLabel}>
                  <LockKeyhole size={13} aria-hidden="true" /> Seguro
                </span>
              </div>

              <div className={styles.documentArea}>
                <div className={styles.paper}>
                  <div className={styles.paperTitle}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</div>
                  <div className={styles.paperMeta}>Documento nº SJ-8241</div>
                  <div className={styles.paperLines} aria-hidden="true">
                    <i /><i /><i /><i /><i /><i /><i />
                  </div>
                  <div className={styles.signatureStamp}>
                    <BadgeCheck size={20} aria-hidden="true" />
                    <span><strong>Assinado eletronicamente</strong>Identidade e integridade registradas</span>
                  </div>
                </div>

                <aside className={styles.flowPanel}>
                  <span className={styles.flowLabel}>Progresso do documento</span>
                  <div className={styles.flowItem}>
                    <span><MailCheck size={15} /></span>
                    <div><strong>Enviado</strong><small>Hoje, 10:32</small></div>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className={styles.flowItem}>
                    <span><KeyRound size={15} /></span>
                    <div><strong>Identidade confirmada</strong><small>Código validado</small></div>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className={`${styles.flowItem} ${styles.flowCurrent}`}>
                    <span><FileSignature size={15} /></span>
                    <div><strong>Assinatura concluída</strong><small>Evidências preservadas</small></div>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className={styles.validationCode}>
                    <QrCode size={34} aria-hidden="true" />
                    <span><small>Código de validação</small><strong>SJ8K-24M1-7PQL</strong></span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
          <div className={styles.scrollHint}>Conheça o produto <span aria-hidden="true">↓</span></div>
        </section>

        <section className={styles.proofBand} aria-label="Pilares da plataforma">
          <div><Fingerprint size={21} /><span><strong>Autoria</strong>Eventos vinculados ao signatário</span></div>
          <div><ShieldCheck size={21} /><span><strong>Integridade</strong>Evidências ligadas ao documento</span></div>
          <div><Clock3 size={21} /><span><strong>Rastreabilidade</strong>Linha do tempo auditável</span></div>
          <div><ScanSearch size={21} /><span><strong>Validação</strong>Consulta simples e independente</span></div>
        </section>

        <section id="como-funciona" className={styles.section} aria-labelledby="how-title">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Do envio à conclusão</span>
            <h2 id="how-title">Um processo simples para quem envia e para quem assina.</h2>
            <p>Menos etapas operacionais, mais clareza sobre o que aconteceu com cada documento.</p>
          </div>

          <div className={styles.steps}>
            <article>
              <span className={styles.stepNumber}>01</span>
              <div className={styles.stepIcon}><FileCheck2 size={23} /></div>
              <h3>Prepare o documento</h3>
              <p>Envie o arquivo, informe os signatários e defina o fluxo de autenticação.</p>
            </article>
            <article>
              <span className={styles.stepNumber}>02</span>
              <div className={styles.stepIcon}><MailCheck size={23} /></div>
              <h3>Convide para assinar</h3>
              <p>Cada pessoa recebe um acesso individual e conclui a assinatura pelo navegador.</p>
            </article>
            <article>
              <span className={styles.stepNumber}>03</span>
              <div className={styles.stepIcon}><BadgeCheck size={23} /></div>
              <h3>Conclua com evidências</h3>
              <p>O documento final permanece associado à trilha de auditoria e à sua validação.</p>
            </article>
          </div>
        </section>

        <section id="seguranca" className={styles.securitySection} aria-labelledby="security-title">
          <div className={styles.securityInner}>
            <div className={styles.securityCopy}>
              <span className={styles.sectionKicker}>Cadeia de custódia digital</span>
              <h2 id="security-title">Não é apenas uma assinatura desenhada sobre o PDF.</h2>
              <p>
                Cada ação relevante compõe um histórico que ajuda a demonstrar
                como o documento circulou, quem participou e quando o processo
                foi concluído.
              </p>
              <ul>
                <li><CheckCircle2 size={18} /> Eventos cronológicos do envelope</li>
                <li><CheckCircle2 size={18} /> Evidências de autenticação dos participantes</li>
                <li><CheckCircle2 size={18} /> Registro de integridade do documento</li>
                <li><CheckCircle2 size={18} /> Certificado e código para validação</li>
              </ul>
            </div>

            <div className={styles.auditPanel}>
              <div className={styles.auditHeader}>
                <span><ShieldCheck size={18} /> Trilha de auditoria</span>
                <BadgeCheck size={19} />
              </div>
              <div className={styles.auditHash}>
                <small>Identificador de integridade</small>
                <strong>8f42a91c...73bd0e26</strong>
              </div>
              <ol>
                <li><span>10:32</span><div><strong>Documento criado</strong><small>Arquivo original registrado</small></div></li>
                <li><span>10:34</span><div><strong>Convite entregue</strong><small>Destinatário notificado</small></div></li>
                <li><span>10:41</span><div><strong>Identidade confirmada</strong><small>Autenticação concluída</small></div></li>
                <li><span>10:43</span><div><strong>Documento assinado</strong><small>Processo finalizado</small></div></li>
              </ol>
            </div>
          </div>
        </section>

        <section id="recursos" className={styles.section} aria-labelledby="features-title">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Tudo no mesmo fluxo</span>
            <h2 id="features-title">Recursos para assinar com mais controle.</h2>
            <p>Uma experiência profissional para contratos, autorizações, propostas e outros documentos.</p>
          </div>

          <div className={styles.featuresGrid}>
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <div className={styles.featureIcon}><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="planos" className={styles.pricingSection} aria-labelledby="pricing-title">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Planos simples e transparentes</span>
            <h2 id="pricing-title">Comece grátis. Aumente o volume quando precisar.</h2>
            <p>Todos os planos reúnem assinatura eletrônica, acompanhamento e trilha de auditoria.</p>
          </div>

          <div className={styles.plansGrid}>
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={plan.featured ? styles.featuredPlan : undefined}
              >
                {plan.featured && <span className={styles.planBadge}>Comece aqui</span>}
                <header>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </header>
                <div className={styles.planPrice}>
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </div>
                <ul>
                  <li><CheckCircle2 size={17} /> {plan.documents}</li>
                  <li><ShieldCheck size={17} /> {plan.certificates}</li>
                  <li><Clock3 size={17} /> Trilha de auditoria</li>
                  <li><ScanSearch size={17} /> Validação do documento</li>
                </ul>
                <Link
                  href={`/contato?assunto=assinatura-${plan.name.toLowerCase()}`}
                  className={plan.featured ? styles.primaryAction : styles.planAction}
                >
                  {plan.action}
                  <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>

          <div className={styles.extraPlans}>
            <article>
              <div className={styles.extraPlanIcon}><PackageCheck size={24} /></div>
              <div>
                <span>Uso sem limites</span>
                <h3>Documentos + certificados ilimitados</h3>
                <p>Para operações que precisam assinar e blindar documentos sem limite mensal.</p>
              </div>
              <div className={styles.extraPrice}><strong>R$ 300</strong><span>/mês</span></div>
              <Link href="/contato?assunto=assinatura-ilimitada" className={styles.secondaryAction}>Escolher ilimitado</Link>
            </article>
            <article>
              <div className={styles.extraPlanIcon}><ShieldCheck size={24} /></div>
              <div>
                <span>Compra avulsa</span>
                <h3>Certificado de blindagem</h3>
                <p>Adicione um certificado individual sempre que sua operação precisar.</p>
              </div>
              <div className={styles.extraPrice}><strong>R$ 5</strong><span>/unidade</span></div>
              <Link href="/contato?assunto=certificado-blindagem" className={styles.secondaryAction}>Solicitar certificado</Link>
            </article>
          </div>
        </section>

        <section className={styles.validationSection} aria-labelledby="validation-title">
          <div className={styles.validationMark}><QrCode size={54} /></div>
          <div>
            <span className={styles.sectionKicker}>Verificação pública</span>
            <h2 id="validation-title">A confiança continua depois da assinatura.</h2>
            <p>Consulte o código do documento para conferir sua integridade e as evidências registradas na conclusão.</p>
          </div>
          <Link href="/validar" className={styles.secondaryAction}>Validar um documento <ArrowRight size={18} /></Link>
        </section>

        <section id="duvidas" className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Dúvidas frequentes</span>
            <h2 id="faq-title">O essencial, sem letras miúdas.</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<span aria-hidden="true">+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-cta-title">
          <div>
            <span className={styles.sectionKicker}>Social Jurídico Assinatura</span>
            <h2 id="final-cta-title">Documentos importantes merecem um processo à altura.</h2>
            <p>Crie sua conta e assine até 3 documentos por mês gratuitamente.</p>
          </div>
          <Link href="/contato?assunto=assinatura" className={styles.primaryAction}>
            Comece gratuitamente <ArrowRight size={19} />
          </Link>
        </section>
      </div>
    </div>
  );
}
