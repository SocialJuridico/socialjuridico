"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  Coins,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserCheck,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import {
  SPECIALTIES,
  useLawyerProfile,
} from "../useLawyerProfile";
import styles from "../LawyerProfile.module.css";

function StatusBadge({ profile }) {
  if (profile?.oab_verification_status === "VERIFIED" || profile?.verified) {
    return (
      <span className={styles.badge}>
        <UserCheck size={14} /> OAB verificada
      </span>
    );
  }

  if (profile?.oab_verification_status === "ERROR") {
    return (
      <span className={`${styles.badge} ${styles.dangerBadge}`}>
        <AlertTriangle size={14} /> OAB com pendencia
      </span>
    );
  }

  return (
    <span className={`${styles.badge} ${styles.mutedBadge}`}>
      <Clock size={14} /> Verificacao pendente
    </span>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <label className={styles.field}>
      <span>
        {label} <Lock size={12} aria-hidden="true" />
      </span>
      <input value={value || "---"} readOnly className={styles.readOnly} />
    </label>
  );
}

export default function LawyerProfileDashboard() {
  const {
    profileData,
    loadingProfile,
    sessionError,
    form,
    selectedSpecialties,
    completion,
    fileInputRef,
    isSaving,
    isUploading,
    updateField,
    toggleSpecialty,
    saveProfile,
    uploadAvatar,
    formatPhone,
  } = useLawyerProfile();

  const ratingTotal = Number(profileData?.total_ratings || 0);
  const ratingAverage = Number(profileData?.avg_rating || 0);
  const planType = String(profileData?.plan_type || "FREE").toUpperCase();
  const isPremium = profileData?.is_premium || planType !== "FREE";

  return (
    <LawyerDashboardShell
      activeRoute="meuperfil"
      title="Meu Perfil"
      subtitle="Dados profissionais, atendimento e apresentacao publica"
      icon={User}
    >
      <div className={styles.page}>
        {loadingProfile && (
          <section className={styles.notice}>
            <Loader2 className={styles.spin} size={22} />
            <div>
              <h2>Carregando perfil</h2>
              <p>Estamos buscando seus dados profissionais.</p>
            </div>
          </section>
        )}

        {!loadingProfile && sessionError && (
          <section className={styles.notice}>
            <AlertTriangle size={22} />
            <div>
              <h2>Nao foi possivel carregar</h2>
              <p>{sessionError}</p>
            </div>
          </section>
        )}

        {!loadingProfile && profileData && (
          <div className={styles.layout}>
            <aside className={styles.side}>
              <section className={styles.identityCard}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>
                    {profileData.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profileData.avatar} alt="" />
                    ) : (
                      <span>{profileData.name?.charAt(0) || "A"}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={styles.avatarButton}
                  >
                    {isUploading ? (
                      <Loader2 className={styles.spin} size={15} />
                    ) : (
                      <Camera size={15} />
                    )}
                    Alterar foto
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) => uploadAvatar(event.target.files?.[0])}
                  />
                </div>

                <div className={styles.identityText}>
                  <span>Perfil profissional</span>
                  <h2>{profileData.name || "Advogado"}</h2>
                  <p>{profileData.oab || "OAB nao informada"}</p>
                </div>

                <div className={styles.badges}>
                  {isPremium && (
                    <span className={styles.badge}>
                      <Sparkles size={14} /> Plano {planType}
                    </span>
                  )}
                  <StatusBadge profile={profileData} />
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <h3>Completude</h3>
                  <strong>{completion.percentage}%</strong>
                </header>
                <div className={styles.progress}>
                  <i style={{ width: `${completion.percentage}%` }} />
                </div>
                <div className={styles.checkList}>
                  {completion.missing.length ? (
                    completion.missing.map((item) => (
                      <span key={item}>
                        <AlertTriangle size={15} /> Falta {item}
                      </span>
                    ))
                  ) : (
                    <span>
                      <Check size={15} /> Perfil profissional completo
                    </span>
                  )}
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <h3>Avaliacao</h3>
                  <Star size={18} />
                </header>
                {ratingTotal > 0 ? (
                  <p>
                    <strong>{ratingAverage.toFixed(1)}</strong> de 5 com{" "}
                    {ratingTotal} avaliacao{ratingTotal === 1 ? "" : "es"}.
                  </p>
                ) : (
                  <p>Ainda sem avaliacoes publicas na plataforma.</p>
                )}
              </section>

              <section className={styles.panel}>
                <header>
                  <h3>Conta</h3>
                  <ShieldCheck size={18} />
                </header>
                <p className={styles.accountLine}>
                  <Mail size={15} />
                  <span>{profileData.email || "E-mail indisponivel"}</span>
                </p>
                {profileData.nome_escritorio && (
                  <p className={styles.accountLine}>
                    <User size={15} />
                    <span>{profileData.nome_escritorio}</span>
                  </p>
                )}
              </section>
            </aside>

            <form className={styles.form} onSubmit={saveProfile}>
              <section className={styles.formSection}>
                <header>
                  <User size={18} />
                  <h2>Dados profissionais</h2>
                </header>

                <div className={styles.grid}>
                  <ReadOnlyField label="Nome completo" value={form.name} />
                  <label className={styles.field}>
                    <span>Celular WhatsApp</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={formatPhone(form.phone)}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      placeholder="(11) 99999-9999"
                    />
                  </label>
                  <ReadOnlyField label="Numero OAB" value={form.oab} />
                  <ReadOnlyField label="Estado UF" value={form.estado} />
                  <label className={styles.field}>
                    <span>Nova senha</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                      placeholder="Deixe em branco para manter"
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <header>
                  <Sparkles size={18} />
                  <h2>Especialidades e bio</h2>
                </header>

                <label className={styles.field}>
                  <span>Areas de atuacao</span>
                  <div className={styles.specialties}>
                    {SPECIALTIES.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        className={
                          selectedSpecialties.includes(specialty)
                            ? styles.specialtyActive
                            : ""
                        }
                        onClick={() => toggleSpecialty(specialty)}
                      >
                        <Check size={14} />
                        {specialty}
                      </button>
                    ))}
                  </div>
                </label>

                <label className={styles.field}>
                  <span>Apresentacao profissional</span>
                  <textarea
                    rows={6}
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Descreva sua trajetoria, areas de foco e como costuma conduzir o atendimento ao cliente."
                    maxLength={1200}
                  />
                  <small>{form.bio.length}/1200 caracteres</small>
                </label>
              </section>

              <section className={styles.formSection}>
                <header>
                  <Coins size={18} />
                  <h2>Atendimento e consulta</h2>
                </header>

                <div className={styles.segmented}>
                  <button
                    type="button"
                    className={form.consulta === "Gratuita" ? styles.active : ""}
                    onClick={() => updateField("consulta", "Gratuita")}
                  >
                    <Check size={15} /> Consulta gratuita
                  </button>
                  <button
                    type="button"
                    className={form.consulta === "Paga" ? styles.active : ""}
                    onClick={() => updateField("consulta", "Paga")}
                  >
                    <Coins size={15} /> Consulta paga
                  </button>
                </div>

                {form.consulta === "Paga" && (
                  <div className={styles.grid}>
                    <label className={styles.field}>
                      <span>Tempo de consulta</span>
                      <input
                        value={form.tempo}
                        onChange={(event) =>
                          updateField("tempo", event.target.value)
                        }
                        placeholder="Ex.: 45 minutos"
                        maxLength={60}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Valor R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.valor}
                        onChange={(event) =>
                          updateField("valor", event.target.value)
                        }
                        placeholder="0,00"
                      />
                    </label>
                  </div>
                )}
              </section>

              <footer className={styles.actions}>
                <span>
                  <Phone size={15} />
                  Dados publicos ajudam clientes a encontrarem voce com mais
                  confianca.
                </span>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className={styles.spin} size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Salvar perfil
                </button>
              </footer>
            </form>
          </div>
        )}
      </div>
    </LawyerDashboardShell>
  );
}
