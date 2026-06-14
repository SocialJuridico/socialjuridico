"use client";

import { Children } from "react";
import {
  AlertTriangle,
  Hash,
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  Video,
  Volume2,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { useInternalCommunication } from "../useInternalCommunication";
import styles from "../InternalCommunication.module.css";

function roleLabel(role) {
  if (role === "admin") return "Gestor";
  if (role === "secretaria") return "Secretaria";
  if (role === "estagiario") return "Estagiario";
  return "Advogado";
}

function initials(name) {
  return String(name || "M")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Notice({ icon: Icon = AlertTriangle, title, message, action }) {
  return (
    <section className={styles.notice}>
      <Icon size={22} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </section>
  );
}

function ChannelButton({
  icon: Icon,
  active,
  label,
  meta,
  onClick,
  onDelete,
  canDelete,
}) {
  return (
    <button
      type="button"
      className={`${styles.channelButton} ${active ? styles.activeChannel : ""}`}
      onClick={onClick}
    >
      <span className={styles.channelName}>
        <Icon size={15} />
        {label}
      </span>
      {meta && <small>{meta}</small>}
      {canDelete && (
        <span
          role="button"
          tabIndex={0}
          className={styles.deleteChannel}
          onClick={onDelete}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onDelete(event);
          }}
        >
          <Trash2 size={13} />
        </span>
      )}
    </button>
  );
}

function ChannelGroup({ title, children, empty }) {
  const hasChildren = Children.count(children) > 0;

  return (
    <section className={styles.channelGroup}>
      <h3>{title}</h3>
      <div className={styles.channelList}>{hasChildren ? children : <p>{empty}</p>}</div>
    </section>
  );
}

function Sidebar({ controller }) {
  return (
    <aside className={styles.sidebar}>
      <header className={styles.sidebarHeader}>
        <div>
          <span>Canais</span>
          <strong>{controller.profileData?.nome_escritorio || "Escritorio"}</strong>
        </div>
        {controller.isOfficeAdmin && (
          <button
            type="button"
            onClick={() => controller.setIsChannelModalOpen(true)}
            title="Criar canal"
          >
            <Plus size={17} />
          </button>
        )}
      </header>

      <div className={styles.channels}>
        <ChannelGroup title="Texto">
          <ChannelButton
            icon={Hash}
            active={controller.activeChannelId === null && !controller.activeMeetingRoom}
            label="geral"
            meta={`${controller.data.mensagens.filter((item) => !item.canal_id).length} msgs`}
            onClick={() => controller.selectTextChannel(null)}
          />
          {controller.channelsByType.texto.map((channel) => (
            <ChannelButton
              key={channel.id}
              icon={Hash}
              active={controller.activeChannelId === channel.id}
              label={channel.nome}
              meta={`${controller.data.mensagens.filter((item) => item.canal_id === channel.id).length} msgs`}
              onClick={() => controller.selectTextChannel(channel.id)}
              onDelete={(event) => controller.deleteChannel(event, channel.id)}
              canDelete={controller.isOfficeAdmin}
            />
          ))}
        </ChannelGroup>

        <ChannelGroup title="Voz" empty="Nenhuma sala de voz.">
          {controller.channelsByType.voz.map((channel) => {
            const participants = controller.data.participantesVoz.filter(
              (item) => item.canal_id === channel.id,
            );
            const isCurrent = participants.some(
              (item) => item.member_id === controller.profileData?.id,
            );

            return (
              <div key={channel.id} className={styles.voiceBlock}>
                <ChannelButton
                  icon={Volume2}
                  active={isCurrent}
                  label={channel.nome}
                  meta={`${participants.length}/${channel.limite_pessoas || "sem limite"}`}
                  onClick={() => controller.joinVoice(channel.id)}
                  onDelete={(event) => controller.deleteChannel(event, channel.id)}
                  canDelete={controller.isOfficeAdmin}
                />
                {participants.length > 0 && (
                  <div className={styles.voiceUsers}>
                    {participants.map((participant) => (
                      <span key={participant.id}>
                        <i>{initials(participant.member_name)}</i>
                        {participant.member_name}
                        {participant.mutado ? <MicOff size={12} /> : <Mic size={12} />}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ChannelGroup>

        <ChannelGroup title="Video" empty="Nenhuma sala de video.">
          {controller.channelsByType.video.map((channel) => (
            <ChannelButton
              key={channel.id}
              icon={Video}
              active={controller.activeMeetingRoom === channel.id}
              label={channel.nome}
              onClick={() => controller.selectMeeting(channel.id)}
              onDelete={(event) => controller.deleteChannel(event, channel.id)}
              canDelete={controller.isOfficeAdmin}
            />
          ))}
        </ChannelGroup>
      </div>

      {controller.myVoice && (
        <section className={styles.voiceStatus}>
          <header>
            <Headphones size={16} />
            <span>{controller.activeVoiceRoom?.nome || "Sala de voz"}</span>
          </header>
          <div>
            <button
              type="button"
              className={controller.myVoice.mutado ? styles.muted : ""}
              onClick={controller.toggleMute}
              disabled={controller.submitting}
            >
              {controller.myVoice.mutado ? <MicOff size={15} /> : <Mic size={15} />}
              {controller.myVoice.mutado ? "Mutado" : "Microfone"}
            </button>
            <button
              type="button"
              className={styles.leave}
              onClick={controller.leaveVoice}
              disabled={controller.submitting}
            >
              <PhoneOff size={15} /> Sair
            </button>
          </div>
        </section>
      )}
    </aside>
  );
}

function MeetingView({ controller }) {
  const meeting = controller.currentMeeting;
  return (
    <section className={styles.meetingView}>
      <header className={styles.chatHeader}>
        <div>
          <span>Sala de video</span>
          <h2>{meeting?.nome || "Reuniao"}</h2>
        </div>
      </header>

      <div className={styles.meetingCard}>
        <Video size={44} />
        <h3>Videoconferencia protegida por sala unica</h3>
        <p>
          A reuniao sera aberta em uma aba separada do Jitsi com nome de sala
          vinculado ao escritorio e ao canal selecionado.
        </p>
        <button type="button" onClick={controller.openMeeting}>
          <Video size={18} /> Entrar na reuniao
        </button>
      </div>
    </section>
  );
}

function ChatView({ controller }) {
  const channelName = controller.currentTextChannel?.nome || "geral";

  return (
    <section className={styles.chatView}>
      <header className={styles.chatHeader}>
        <div>
          <span>Canal de texto</span>
          <h2># {channelName}</h2>
        </div>
        <small>{controller.visibleMessages.length} mensagens</small>
      </header>

      <div ref={controller.messageListRef} className={styles.messages}>
        {controller.visibleMessages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <MessageSquare size={28} />
            <p>Nenhuma mensagem neste canal ainda.</p>
          </div>
        ) : (
          controller.visibleMessages.map((item) => (
            <article key={item.id} className={styles.messageItem}>
              <span className={styles.avatar}>{initials(item.sender_name)}</span>
              <div>
                <header>
                  <strong>{item.sender_name || "Membro"}</strong>
                  <small className={styles.role}>{roleLabel(item.sender_cargo)}</small>
                  <time>{formatTime(item.created_at)}</time>
                </header>
                <p>{item.mensagem}</p>
              </div>
            </article>
          ))
        )}
      </div>

      <form className={styles.messageForm} onSubmit={controller.sendMessage}>
        <input
          value={controller.message}
          onChange={(event) => controller.setMessage(event.target.value)}
          placeholder={`Enviar mensagem em #${channelName}`}
          maxLength={2000}
        />
        <button type="submit" disabled={controller.submitting || !controller.message.trim()}>
          {controller.submitting ? (
            <Loader2 className={styles.spin} size={17} />
          ) : (
            <Send size={17} />
          )}
          Enviar
        </button>
      </form>
    </section>
  );
}

function ChannelModal({ controller }) {
  if (!controller.isChannelModalOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={() => controller.setIsChannelModalOpen(false)}>
      <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Novo canal</span>
            <h2>Criar espaco interno</h2>
          </div>
          <button type="button" onClick={() => controller.setIsChannelModalOpen(false)}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={controller.createChannel}>
          <label className={styles.field}>
            <span>Nome do canal</span>
            <input
              value={controller.channelForm.nome}
              onChange={(event) =>
                controller.setChannelForm((current) => ({
                  ...current,
                  nome: event.target.value,
                }))
              }
              placeholder="ex.: atendimento, prazos, societario"
              maxLength={60}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Tipo</span>
            <select
              value={controller.channelForm.tipo}
              onChange={(event) =>
                controller.setChannelForm((current) => ({
                  ...current,
                  tipo: event.target.value,
                }))
              }
            >
              {controller.channelTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {controller.channelForm.tipo === "voz" && (
            <label className={styles.field}>
              <span>Limite de pessoas</span>
              <input
                type="number"
                min="0"
                max="100"
                value={controller.channelForm.limite}
                onChange={(event) =>
                  controller.setChannelForm((current) => ({
                    ...current,
                    limite: event.target.value,
                  }))
                }
              />
            </label>
          )}

          <footer>
            <button type="button" onClick={() => controller.setIsChannelModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={controller.submitting}>
              {controller.submitting ? <Loader2 className={styles.spin} size={17} /> : <Plus size={17} />}
              Criar canal
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function InternalCommunicationDashboard() {
  const controller = useInternalCommunication();

  return (
    <LawyerDashboardShell
      activeRoute="comunicacaointerna"
      title="Comunicacao Interna"
      subtitle="Canais do escritorio, mensagens e salas de reuniao"
      icon={MessageSquare}
    >
      <div className={styles.page}>
        {(controller.loadingProfile || controller.loading) && (
          <Notice
            icon={Loader2}
            title="Carregando comunicacao"
            message="Estamos preparando os canais internos do escritorio."
          />
        )}

        {!controller.loadingProfile && controller.sessionError && (
          <Notice title="Sessao indisponivel" message={controller.sessionError} />
        )}

        {!controller.loadingProfile && !controller.officeId && (
          <Notice
            icon={Users}
            title="Recurso exclusivo para escritorios"
            message="Esta area fica disponivel quando o advogado esta vinculado a um escritorio na plataforma."
          />
        )}

        {!controller.loading && controller.error && controller.officeId && (
          <Notice
            title="Nao foi possivel carregar"
            message={controller.error}
            action={
              <button type="button" className={styles.noticeAction} onClick={controller.loadCommunication}>
                <RefreshCw size={16} /> Tentar novamente
              </button>
            }
          />
        )}

        {!controller.loading && !controller.error && controller.officeId && (
          <>
            <section className={styles.summary}>
              <article>
                <span>Canais</span>
                <strong>{controller.data.canais.length + 1}</strong>
              </article>
              <article>
                <span>Mensagens</span>
                <strong>{controller.data.mensagens.length}</strong>
              </article>
              <article>
                <span>Em voz</span>
                <strong>{controller.data.participantesVoz.length}</strong>
              </article>
            </section>

            <main className={styles.workspace}>
              <Sidebar controller={controller} />
              {controller.activeMeetingRoom ? (
                <MeetingView controller={controller} />
              ) : (
                <ChatView controller={controller} />
              )}
            </main>
          </>
        )}

        <ChannelModal controller={controller} />
      </div>
    </LawyerDashboardShell>
  );
}
