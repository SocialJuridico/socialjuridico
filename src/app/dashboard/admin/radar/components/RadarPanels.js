import { Check, Sparkles, X } from "lucide-react";

import { CATEGORY_OPTIONS } from "../utils/radarFormatters";
import styles from "../page.module.css";

function FormField({ label, children, full = false }) {
  return (
    <label className={`${styles.formGroup} ${full ? styles.formGroupFull : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function RadarPanels({
  panel,
  form,
  setForm,
  jsonText,
  setJsonText,
  captureForm,
  setCaptureForm,
  capturePreview,
  setCapturePreview,
  busy,
  onClose,
  onCreate,
  onImport,
  onAnalyze,
  onSaveCapture,
}) {
  if (!panel) return null;

  if (panel === "create") {
    return (
      <form className={styles.panel} onSubmit={onCreate}>
        <div className={styles.panelHeader}>
          <div><span>Cadastro manual</span><h2>Nova oportunidade pública</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <div className={styles.formGrid}>
          <FormField label="Título"><input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></FormField>
          <FormField label="URL original"><input type="url" required value={form.url_original} onChange={(e) => setForm({ ...form, url_original: e.target.value })} /></FormField>
          <FormField label="Categoria"><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField label="Fonte"><input required value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} /></FormField>
          <FormField label="Cidade"><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></FormField>
          <FormField label="Estado"><input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></FormField>
          <FormField label="Score"><input type="number" min="0" max="100" value={form.score_intencao} onChange={(e) => setForm({ ...form, score_intencao: Number(e.target.value) })} /></FormField>
          <FormField label="Urgência"><select value={form.urgencia} onChange={(e) => setForm({ ...form, urgencia: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></FormField>
          <FormField label="Trecho público" full><textarea maxLength={500} rows={3} value={form.trecho_publico} onChange={(e) => setForm({ ...form, trecho_publico: e.target.value })} /></FormField>
          <FormField label="Resumo IA" full><textarea rows={3} value={form.resumo_ia} onChange={(e) => setForm({ ...form, resumo_ia: e.target.value })} /></FormField>
        </div>
        <div className={styles.panelActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancelar</button><button type="submit" className={styles.goldButton} disabled={busy === "create"}>{busy === "create" ? "Salvando..." : "Salvar oportunidade"}</button></div>
      </form>
    );
  }

  if (panel === "import") {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><span>Importação em lote</span><h2>Importar oportunidades em JSON</h2></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </div>
        <p className={styles.panelIntro}>Cole um array JSON estruturado. URLs duplicadas serão ignoradas.</p>
        <textarea className={styles.jsonArea} rows={10} value={jsonText} onChange={(e) => setJsonText(e.target.value)} placeholder='[{"titulo":"...","categoria":"...","fonte":"...","url_original":"..."}]' />
        <div className={styles.panelActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancelar</button><button type="button" className={styles.greenButton} onClick={onImport} disabled={busy === "import"}>{busy === "import" ? "Importando..." : "Executar importação"}</button></div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><span>Captura assistida por IA</span><h2>Capturador manual inteligente</h2></div>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar"><X size={17} /></button>
      </div>
      <p className={styles.panelIntro}>Informe a URL e o texto público. Telefones, e-mails e CPFs são removidos antes da análise.</p>
      <div className={styles.formGrid}>
        <FormField label="URL pública"><input type="url" value={captureForm.url} onChange={(e) => setCaptureForm({ ...captureForm, url: e.target.value })} /></FormField>
        <FormField label="Fonte"><select value={captureForm.fonte} onChange={(e) => setCaptureForm({ ...captureForm, fonte: e.target.value })}><option>Facebook</option><option>Instagram</option><option>X / Twitter</option><option>JusBrasil</option><option>Reddit</option></select></FormField>
        <FormField label="Texto da publicação" full><textarea rows={6} maxLength={2000} value={captureForm.texto} onChange={(e) => setCaptureForm({ ...captureForm, texto: e.target.value })} /></FormField>
      </div>
      {capturePreview && (
        <div className={styles.previewBox}>
          <strong>Pré-visualização</strong>
          <dl><div><dt>Título</dt><dd>{capturePreview.titulo}</dd></div><div><dt>Categoria</dt><dd>{capturePreview.categoria}</dd></div><div><dt>Score</dt><dd>{capturePreview.score_intencao}%</dd></div><div><dt>Urgência</dt><dd>{capturePreview.urgencia}</dd></div><div><dt>Local</dt><dd>{capturePreview.cidade || "—"} / {capturePreview.estado || "—"}</dd></div><div><dt>Resumo</dt><dd>{capturePreview.resumo_ia || "—"}</dd></div></dl>
        </div>
      )}
      <div className={styles.panelActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => capturePreview ? setCapturePreview(null) : onClose()}>{capturePreview ? "Reanalisar" : "Cancelar"}</button>
        {capturePreview ? (
          <button type="button" className={styles.greenButton} onClick={onSaveCapture} disabled={busy === "capture-save"}><Check size={15} />{busy === "capture-save" ? "Salvando..." : "Confirmar e salvar"}</button>
        ) : (
          <button type="button" className={styles.purpleButton} onClick={onAnalyze} disabled={busy === "capture-analyze"}><Sparkles size={15} />{busy === "capture-analyze" ? "Analisando..." : "Analisar com IA"}</button>
        )}
      </div>
    </section>
  );
}
