import {
  KeyRound,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  formatDate,
  formatDateTime,
  getAdminInitials,
} from "../utils/adminFormatters";
import styles from "../AdminsAdmin.module.css";

function AdminActions({ admin, currentAdminId, busyId, onEdit, onReset, onDelete }) {
  const busy = busyId === admin.id;
  const isCurrent = currentAdminId === admin.id;

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        className={styles.editButton}
        onClick={() => onEdit(admin)}
        disabled={busy}
      >
        <Pencil size={14} aria-hidden="true" />
        Editar
      </button>

      <button
        type="button"
        className={styles.resetButton}
        onClick={() => onReset(admin)}
        disabled={busy}
      >
        <KeyRound size={14} aria-hidden="true" />
        Redefinir senha
      </button>

      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onDelete(admin)}
        disabled={busy || isCurrent}
        title={isCurrent ? "Você não pode excluir o próprio acesso." : undefined}
      >
        <Trash2 size={14} aria-hidden="true" />
        Excluir
      </button>
    </div>
  );
}

export default function AdminsTable({
  admins,
  currentAdminId,
  busyId,
  onEdit,
  onReset,
  onDelete,
}) {
  if (!admins.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <UserRound size={28} aria-hidden="true" />
        </span>
        <h2>Nenhum administrador encontrado</h2>
        <p>Ajuste a busca ou cadastre um novo administrador.</p>
      </div>
    );
  }

  return (
    <section className={styles.listSection} aria-label="Lista de administradores">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Administrador</th>
              <th>Telefone</th>
              <th>Último acesso</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const isCurrent = admin.id === currentAdminId;

              return (
                <tr key={admin.id}>
                  <td>
                    <div className={styles.adminIdentity}>
                      <span className={styles.adminAvatar} aria-hidden="true">
                        {getAdminInitials(admin.name, admin.email)}
                      </span>
                      <div>
                        <strong>
                          {admin.name || "Administrador sem nome"}
                          {isCurrent && (
                            <span className={styles.currentBadge}>Você</span>
                          )}
                        </strong>
                        <a href={`mailto:${admin.email || ""}`}>
                          <Mail size={13} aria-hidden="true" />
                          {admin.email || "E-mail não informado"}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>{admin.phone || "Não informado"}</td>
                  <td>{formatDateTime(admin.last_sign_in_at)}</td>
                  <td>{formatDate(admin.created_at)}</td>
                  <td>
                    <AdminActions
                      admin={admin}
                      currentAdminId={currentAdminId}
                      busyId={busyId}
                      onEdit={onEdit}
                      onReset={onReset}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {admins.map((admin) => {
          const isCurrent = admin.id === currentAdminId;

          return (
            <article key={admin.id} className={styles.mobileCard}>
              <header className={styles.mobileCardHeader}>
                <div className={styles.adminIdentity}>
                  <span className={styles.adminAvatar} aria-hidden="true">
                    {getAdminInitials(admin.name, admin.email)}
                  </span>
                  <div>
                    <strong>
                      {admin.name || "Administrador sem nome"}
                      {isCurrent && (
                        <span className={styles.currentBadge}>Você</span>
                      )}
                    </strong>
                    <span>{admin.email || "E-mail não informado"}</span>
                  </div>
                </div>
                <span className={styles.roleBadge}>
                  <ShieldCheck size={13} aria-hidden="true" />
                  ADMIN
                </span>
              </header>

              <dl className={styles.mobileDetails}>
                <div><dt>Telefone</dt><dd>{admin.phone || "Não informado"}</dd></div>
                <div><dt>Último acesso</dt><dd>{formatDateTime(admin.last_sign_in_at)}</dd></div>
                <div><dt>Cadastro</dt><dd>{formatDate(admin.created_at)}</dd></div>
              </dl>

              <AdminActions
                admin={admin}
                currentAdminId={currentAdminId}
                busyId={busyId}
                onEdit={onEdit}
                onReset={onReset}
                onDelete={onDelete}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
