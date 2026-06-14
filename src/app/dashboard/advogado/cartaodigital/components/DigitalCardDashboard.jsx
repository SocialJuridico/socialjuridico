"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  FileDown,
  Globe2,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../DigitalCard.module.css";
import { useDigitalCard } from "../useDigitalCard";
import DigitalCardPreview from "./DigitalCardPreview";

const LINK_ICONS = [
  ["link", "Link"],
  ["calendar", "Agenda"],
  ["briefcase", "Serviços"],
  ["book", "Conteúdo"],
  ["file", "Documento"],
  ["globe", "Site"],
  ["message", "Contato"],
  ["scale", "Jurídico"],
  ["star", "Destaque"],
];

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricIcon}><Icon size={18} aria-hidden="true" /></span>
      <div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
    </article>
  );
}

function Toggle({ checked, onChange, label, detail }) {
  return (
    <label className={styles.toggleRow}>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function FormError({ children }) {
  if (!children) return null;
  return <small className={styles.fieldError}>{children}</small>;
}

function Editor({ controller }) {
  const { form, fieldErrors } = controller;
  if (!form) return null;
  return (
    <div className={styles.editor}>
      {fieldErrors.form && (
        <div className={styles.formError}><AlertTriangle size={15} /> {fieldErrors.form}</div>
      )}

      <section className={styles.formSection}>
        <header><span><UserRound size={16} /></span><div><h2>Identidade profissional</h2><p>Esses dados formam o cabeçalho público do seu cartão.</p></div></header>
        <div className={styles.formGrid}>
          <label><span>Nome de exibição</span><input value={form.displayName} maxLength={100} onChange={(event) => controller.updateField("displayName", event.target.value)} placeholder="Seu nome profissional" /><FormError>{fieldErrors.displayName}</FormError></label>
          <label><span>Endereço público</span><div className={styles.slugField}><b>/cartao/</b><input value={form.slug} maxLength={50} onChange={(event) => controller.updateField("slug", event.target.value)} placeholder="seu-nome" /></div><FormError>{fieldErrors.slug}</FormError></label>
          <label className={styles.fieldWide}><span>Título profissional</span><input value={form.headline} maxLength={120} onChange={(event) => controller.updateField("headline", event.target.value)} placeholder="Ex.: Advocacia estratégica em Direito Empresarial" /><FormError>{fieldErrors.headline}</FormError></label>
          <label className={styles.fieldWide}><span>Apresentação</span><textarea value={form.bio} maxLength={700} onChange={(event) => controller.updateField("bio", event.target.value)} placeholder="Uma apresentação curta, humana e objetiva sobre sua atuação." /><div className={styles.fieldHint}>{form.bio.length}/700</div><FormError>{fieldErrors.bio}</FormError></label>
          <label className={styles.fieldWide}><span>URL da foto profissional</span><input value={form.avatarUrl} maxLength={500} onChange={(event) => controller.updateField("avatarUrl", event.target.value)} placeholder="https://..." /><FormError>{fieldErrors.avatarUrl}</FormError></label>
        </div>
      </section>

      <section className={styles.formSection}>
        <header><span><Smartphone size={16} /></span><div><h2>Contato e presença digital</h2><p>Os botões são interativos no cartão online e no PDF.</p></div></header>
        <div className={styles.formGrid}>
          <label><span>WhatsApp</span><input inputMode="tel" value={form.whatsapp} maxLength={20} onChange={(event) => controller.updateField("whatsapp", event.target.value)} placeholder="5511999999999" /></label>
          <label><span>Telefone</span><input inputMode="tel" value={form.phone} maxLength={20} onChange={(event) => controller.updateField("phone", event.target.value)} placeholder="5511999999999" /></label>
          <label><span>E-mail público</span><input type="email" value={form.publicEmail} maxLength={160} onChange={(event) => controller.updateField("publicEmail", event.target.value)} placeholder="contato@escritorio.com.br" /><FormError>{fieldErrors.publicEmail}</FormError></label>
          <label><span>Localização</span><input value={form.location} maxLength={120} onChange={(event) => controller.updateField("location", event.target.value)} placeholder="Cidade - UF ou atendimento nacional" /></label>
          <label className={styles.fieldWide}><span>Website</span><input value={form.website} onChange={(event) => controller.updateField("website", event.target.value)} placeholder="https://seusite.com.br" /><FormError>{fieldErrors.website}</FormError></label>
          <label><span>Instagram</span><input value={form.instagram} onChange={(event) => controller.updateField("instagram", event.target.value)} placeholder="@seuperfil ou URL" /><FormError>{fieldErrors.instagram}</FormError></label>
          <label><span>LinkedIn</span><input value={form.linkedin} onChange={(event) => controller.updateField("linkedin", event.target.value)} placeholder="seu-perfil ou URL" /><FormError>{fieldErrors.linkedin}</FormError></label>
          <label className={styles.fieldWide}><span>YouTube</span><input value={form.youtube} onChange={(event) => controller.updateField("youtube", event.target.value)} placeholder="@seucanal ou URL" /><FormError>{fieldErrors.youtube}</FormError></label>
        </div>
      </section>

      <section className={styles.formSection}>
        <header className={styles.sectionHeaderWithAction}><span><LinkIcon size={16} /></span><div><h2>Links personalizados</h2><p>Adicione serviços, agenda externa, artigos, portfólio ou páginas específicas.</p></div><button type="button" onClick={controller.addCustomLink} disabled={form.customLinks.length >= 8}><Plus size={14} /> Adicionar</button></header>
        <div className={styles.customLinks}>
          {form.customLinks.length === 0 ? (
            <div className={styles.emptyLinks}><LinkIcon size={20} /><span>Nenhum link personalizado. Os canais de contato continuam disponíveis.</span></div>
          ) : form.customLinks.map((link, index) => (
            <article key={link.key || index} className={styles.customLinkCard}>
              <div className={styles.linkOrder}>{index + 1}</div>
              <div className={styles.linkFields}>
                <input value={link.title} maxLength={80} onChange={(event) => controller.updateCustomLink(index, "title", event.target.value)} placeholder="Título do botão" />
                <input value={link.url} onChange={(event) => controller.updateCustomLink(index, "url", event.target.value)} placeholder="https://..." />
                <select value={link.icon} onChange={(event) => controller.updateCustomLink(index, "icon", event.target.value)}>{LINK_ICONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <label className={styles.linkEnabled}><input type="checkbox" checked={link.enabled !== false} onChange={(event) => controller.updateCustomLink(index, "enabled", event.target.checked)} /> Ativo</label>
              </div>
              <div className={styles.linkControls}>
                <button type="button" onClick={() => controller.moveCustomLink(index, -1)} disabled={index === 0} aria-label="Mover link para cima"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => controller.moveCustomLink(index, 1)} disabled={index === form.customLinks.length - 1} aria-label="Mover link para baixo"><ArrowDown size={14} /></button>
                <button type="button" className={styles.deleteLink} onClick={() => controller.removeCustomLink(index)} aria-label="Excluir link"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
          <FormError>{fieldErrors.customLinks}</FormError>
        </div>
      </section>

      <section className={styles.formSection}>
        <header><span><Palette size={16} /></span><div><h2>Aparência</h2><p>Personalize o estilo sem comprometer legibilidade e acessibilidade.</p></div></header>
        <div className={styles.formGrid}>
          <label><span>Tema</span><select value={form.theme} onChange={(event) => controller.updateField("theme", event.target.value)}><option value="midnight">Midnight</option><option value="graphite">Graphite</option><option value="wine">Wine</option><option value="light">Light</option></select></label>
          <label><span>Fundo</span><select value={form.backgroundStyle} onChange={(event) => controller.updateField("backgroundStyle", event.target.value)}><option value="aurora">Aurora</option><option value="mesh">Grade digital</option><option value="solid">Sólido</option><option value="minimal">Minimalista</option></select></label>
          <label className={styles.colorField}><span>Cor de destaque</span><div><input type="color" value={form.accentColor} onChange={(event) => controller.updateField("accentColor", event.target.value.toUpperCase())} /><input value={form.accentColor} maxLength={7} onChange={(event) => controller.updateField("accentColor", event.target.value.toUpperCase())} /></div><FormError>{fieldErrors.accentColor}</FormError></label>
        </div>
      </section>

      <section className={styles.formSection}>
        <header><span><ShieldCheck size={16} /></span><div><h2>Privacidade e publicação</h2><p>Você escolhe exatamente quais informações podem ser exibidas.</p></div></header>
        <div className={styles.toggleGrid}>
          <Toggle checked={form.showPhone} onChange={(value) => controller.updateField("showPhone", value)} label="Exibir telefone" detail="Mantém o botão de ligação visível." />
          <Toggle checked={form.showEmail} onChange={(value) => controller.updateField("showEmail", value)} label="Exibir e-mail" detail="Publica o endereço no cartão e no vCard." />
          <Toggle checked={form.showLocation} onChange={(value) => controller.updateField("showLocation", value)} label="Exibir localização" detail="Mostra somente o texto informado acima." />
          <Toggle checked={form.showRating} onChange={(value) => controller.updateField("showRating", value)} label="Exibir avaliações" detail="Apresenta a nota consolidada da plataforma." />
          <Toggle checked={form.showBrand} onChange={(value) => controller.updateField("showBrand", value)} label="Marca Social Jurídico" detail="Selo discreto de origem e confiança." />
        </div>
      </section>
    </div>
  );
}

export default function DigitalCardDashboard() {
  const controller = useDigitalCard();
  const published = controller.form?.isPublished === true;

  return (
    <LawyerDashboardShell activeRoute="cartaodigital" title="Cartão Digital" subtitle="Sua presença profissional em um único link." icon={Smartphone}>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div><span className={styles.eyebrow}><Sparkles size={14} /> Identidade profissional interativa</span><h1>Um cartão digital que funciona como <em>mini site profissional.</em></h1><p>Centralize contatos, redes, serviços e conteúdos em uma página pública responsiva. Compartilhe por link, salve como contato ou exporte um PDF clicável com QR Code.</p></div>
          <div className={styles.heroStatus}><span className={published ? styles.published : styles.draft}>{published ? <Eye size={13} /> : <EyeOff size={13} />}{published ? "Publicado" : "Rascunho privado"}</span><small>{controller.dirty ? "Alterações não salvas" : "Versão sincronizada"}</small></div>
        </section>

        <section className={styles.metrics}>
          <MetricCard icon={Eye} label="Visualizações" value={controller.metrics.views || 0} detail={`${controller.metrics.uniqueVisitors || 0} visitantes únicos`} />
          <MetricCard icon={BarChart3} label="Cliques" value={controller.metrics.clicks || 0} detail="ações nos canais e links" />
          <MetricCard icon={Share2} label="Compartilhamentos" value={controller.metrics.shares || 0} detail="ações registradas no cartão" />
          <MetricCard icon={Download} label="Contatos salvos" value={controller.metrics.vcardDownloads || 0} detail="downloads do arquivo vCard" />
          <MetricCard icon={FileDown} label="PDFs gerados" value={controller.metrics.pdfDownloads || 0} detail="exportações profissionais" />
        </section>

        <section className={styles.toolbar}>
          <div className={styles.publicUrl}><Globe2 size={14} /><span>{controller.card?.publicUrl || "Carregando endereço público..."}</span></div>
          <div className={styles.toolbarActions}>
            <button type="button" className={styles.iconAction} onClick={() => controller.load({ silent: true })} disabled={controller.refreshing} title="Atualizar"><RefreshCw size={15} className={controller.refreshing ? styles.spinner : undefined} /></button>
            <button type="button" className={styles.secondaryAction} onClick={controller.copyLink} disabled={!published}><Clipboard size={15} /> Copiar link</button>
            <button type="button" className={styles.secondaryAction} onClick={controller.share} disabled={!published}><Share2 size={15} /> Compartilhar</button>
            <button type="button" className={styles.secondaryAction} onClick={controller.downloadPdf} disabled={controller.exporting || controller.loading}>{controller.exporting ? <Loader2 size={15} className={styles.spinner} /> : <FileDown size={15} />} PDF</button>
            {published && controller.card?.publicUrl && <a className={styles.secondaryAction} href={controller.card.publicUrl} target="_blank" rel="noopener noreferrer"><Eye size={15} /> Abrir</a>}
            <button type="button" className={styles.publishAction} onClick={controller.togglePublish} disabled={controller.saving || controller.loading}>{controller.saving ? <Loader2 size={15} className={styles.spinner} /> : published ? <EyeOff size={15} /> : <Globe2 size={15} />}{published ? "Despublicar" : "Publicar"}</button>
            <button type="button" className={styles.primaryAction} onClick={controller.save} disabled={controller.saving || !controller.dirty}>{controller.saving ? <Loader2 size={15} className={styles.spinner} /> : <Save size={15} />} Salvar</button>
          </div>
        </section>

        {controller.loading ? (
          <div className={styles.state}><Loader2 size={30} className={styles.spinner} /><strong>Preparando seu cartão digital…</strong><span>Carregando perfil, configurações públicas e métricas.</span></div>
        ) : controller.error ? (
          <div className={`${styles.state} ${styles.errorState}`}><AlertTriangle size={30} /><strong>Não foi possível carregar o cartão</strong><span>{controller.error}</span><button type="button" className={styles.secondaryAction} onClick={() => controller.load()}>Tentar novamente</button></div>
        ) : (
          <div className={styles.workspace}>
            <Editor controller={controller} />
            <aside className={styles.previewPanel}><div className={styles.previewHeader}><div><span>Prévia em tempo real</span><h2>Experiência mobile</h2></div><span className={styles.liveBadge}><Check size={12} /> Responsiva</span></div><DigitalCardPreview card={controller.previewCard} /><div className={styles.previewNote}><ShieldCheck size={15} /><p>A página pública só mostra os campos autorizados. Alterações entram no ar depois de salvar.</p></div></aside>
          </div>
        )}
      </div>
    </LawyerDashboardShell>
  );
}
