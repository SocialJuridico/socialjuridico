"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Users, RotateCcw, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./ClientesAdmin.module.css";

export default function AdminClientesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/clientes", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Acesso negado");
          router.replace("/dashboard/cliente");
          return;
        }

        setClientes(data.data || []);

        // Verificar status de conexao Google do administrador
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (meRes.ok && meData.success && meData.data) {
          setGoogleConnected(!!meData.data.google_sync_enabled);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do painel.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredClientes = useMemo(() => {
    let result = clientes;

    if (inactivityFilter !== "ALL") {
      const now = new Date();
      result = result.filter((c) => {
        const lastLogin = new Date(c.last_sign_in_at || c.created_at);
        const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        if (inactivityFilter === "7DAYS") return diffDays >= 7;
        if (inactivityFilter === "15DAYS") return diffDays >= 15;
        if (inactivityFilter === "30DAYS") return diffDays >= 30;

        return true;
      });
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const email = String(c.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    return result;
  }, [clientes, search, inactivityFilter]);

  const confirmDelete = async (cliente) => {
    setDeletingId(cliente.id);
    try {
      const res = await fetch(`/api/admin/clientes?id=${cliente.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir cliente.");
        return;
      }

      toast.success("Cliente excluído com sucesso.");
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente.");
    } finally {
      setDeletingId(null);
      setModalAction(null);
    }
  };

  const confirmReset = async (cliente) => {
    setResettingId(cliente.id);
    try {
      const res = await fetch(`/api/admin/clientes?id=${cliente.id}`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao resetar senha.");
        return;
      }

      toast.success("Senha resetada para: socialjuridico1!");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      toast.error("Erro ao resetar senha.");
    } finally {
      setResettingId(null);
      setModalAction(null);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Given Name",
      "Family Name",
      "Phone 1 - Value",
      "E-mail 1 - Value",
      "Group Membership"
    ];

    const rows = filteredClientes.map((c) => {
      const fullName = c.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const givenName = nameParts[0] || "";
      const familyName = nameParts.slice(1).join(" ") || "";
      
      let phone = c.phone || "";
      const digitsOnly = phone.replace(/\D/g, "");
      
      if (digitsOnly) {
        if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
          phone = `+${digitsOnly}`;
        } else if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
          phone = `+55${digitsOnly}`;
        } else {
          phone = phone.startsWith("+") ? phone : `+${digitsOnly}`;
        }
      } else {
        phone = "";
      }

      const email = c.email || "";
      const tag = "Clientes SocialJurídico";

      return [
        fullName,
        givenName,
        familyName,
        phone,
        email,
        tag
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Clientes_Google_Contatos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de Clientes exportado com sucesso!");
  };

  const handleConnectGoogle = () => {
    window.location.href = "/api/auth/google-contacts";
  };

  const handleSyncAPI = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/google-contacts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CLIENTES" })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || "Sincronização com o Google concluída!");
      } else {
        if (data.message === "google_not_connected") {
          toast.error("Sua conta do Google não está conectada.");
          setGoogleConnected(false);
        } else {
          toast.error(data.message || "Falha ao sincronizar com Google Contatos.");
        }
      }
    } catch (error) {
      console.error("Erro ao sincronizar contatos:", error);
      toast.error("Erro de rede ao sincronizar contatos.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando clientes...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao painel admin
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 0 0' }}>
            <Users size={18} /> Clientes cadastrados
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: "linear-gradient(135deg, #475569 0%, #334155 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontWeight: "700",
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(71, 85, 105, 0.2)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(71, 85, 105, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(71, 85, 105, 0.2)";
            }}
          >
            <Download size={16} /> Exportar CSV
          </button>

          {googleConnected ? (
            <button
              type="button"
              onClick={handleSyncAPI}
              disabled={syncing}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                transition: "transform 0.2s, box-shadow 0.2s",
                opacity: syncing ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (syncing) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)";
              }}
              onMouseOut={(e) => {
                if (syncing) return;
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)";
              }}
            >
              {syncing ? "Sincronizando..." : "Sincronizar Google Contatos (API)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogle}
              style={{
                background: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(75, 85, 99, 0.2)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(75, 85, 99, 0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(75, 85, 99, 0.2)";
              }}
            >
              Conectar Google Contatos
            </button>
          )}
        </div>
      </header>

      <div className={styles.searchWrap} style={{ display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.searchInput}
          style={{ paddingLeft: '1rem', width: 'auto', flex: 'none', appearance: 'auto', background: '#1e293b' }}
          value={inactivityFilter}
          onChange={(e) => setInactivityFilter(e.target.value)}
        >
          <option value="ALL">Todos os clientes</option>
          <option value="7DAYS">Inativos há +7 dias</option>
          <option value="15DAYS">Inativos há +15 dias</option>
          <option value="30DAYS">Inativos há +30 dias</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        {filteredClientes.length === 0 ? (
          <p className={styles.empty}>Nenhum cliente encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Último Login</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.name || "-"}</td>
                  <td>{cliente.email || "-"}</td>
                  <td>{cliente.phone || "-"}</td>
                  <td>
                    {cliente.last_sign_in_at
                      ? new Date(cliente.last_sign_in_at).toLocaleString("pt-BR")
                      : cliente.created_at
                        ? new Date(cliente.created_at).toLocaleString("pt-BR")
                        : "-"}
                  </td>
                  <td>
                    {cliente.created_at
                      ? new Date(cliente.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() =>
                          setModalAction({ type: "reset", item: cliente })
                        }
                        disabled={resettingId === cliente.id}
                      >
                        <RotateCcw size={14} />
                        {resettingId === cliente.id ? "Resetando..." : "Reset"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() =>
                          setModalAction({ type: "delete", item: cliente })
                        }
                        disabled={deletingId === cliente.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === cliente.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAction && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalAction(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {modalAction.type === "delete"
                ? "Excluir cliente"
                : "Resetar senha"}
            </h3>
            <p>
              {modalAction.type === "delete" ? (
                <>
                  Confirma a exclusão de{" "}
                  <strong>{modalAction.item.name || "cliente"}</strong>? Esta
                  ação é irreversível.
                </>
              ) : (
                <>
                  Confirma resetar a senha de{" "}
                  <strong>{modalAction.item.name || "cliente"}</strong> para
                  <strong> socialjuridico1!</strong>?
                </>
              )}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModalAction(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() =>
                  modalAction.type === "delete"
                    ? confirmDelete(modalAction.item)
                    : confirmReset(modalAction.item)
                }
                disabled={
                  deletingId === modalAction.item.id ||
                  resettingId === modalAction.item.id
                }
              >
                {modalAction.type === "delete"
                  ? deletingId === modalAction.item.id
                    ? "Excluindo..."
                    : "Confirmar exclusão"
                  : resettingId === modalAction.item.id
                    ? "Resetando..."
                    : "Confirmar reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
