"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Scale, RotateCcw, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdvogadosAdmin.module.css";

export default function AdminAdvogadosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [advogados, setAdvogados] = useState([]);
  const [search, setSearch] = useState("");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [jurisAmount, setJurisAmount] = useState(10);
  const [editOAB, setEditOAB] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("PRO");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const ESTADOS = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/advogados", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Acesso negado");
          router.replace("/dashboard/cliente");
          return;
        }

        setAdvogados(data.data || []);

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

  const filteredAdvogados = useMemo(() => {
    let result = advogados;

    if (inactivityFilter !== "ALL") {
      const now = new Date();
      result = result.filter((a) => {
        const lastLogin = new Date(a.last_sign_in_at || a.created_at);
        const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        if (inactivityFilter === "7DAYS") return diffDays >= 7;
        if (inactivityFilter === "15DAYS") return diffDays >= 15;
        if (inactivityFilter === "30DAYS") return diffDays >= 30;

        return true;
      });
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((a) => {
        const name = String(a.name || "").toLowerCase();
        const email = String(a.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    return result;
  }, [advogados, search, inactivityFilter]);

  const confirmDelete = async (advogado) => {
    setDeletingId(advogado.id);
    try {
      const res = await fetch(`/api/admin/advogados?id=${advogado.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir advogado.");
        return;
      }

      toast.success("Advogado excluído com sucesso.");
      setAdvogados((prev) => prev.filter((a) => a.id !== advogado.id));
    } catch (error) {
      console.error("Erro ao excluir advogado:", error);
      toast.error("Erro ao excluir advogado.");
    } finally {
      setDeletingId(null);
      setModalAction(null);
    }
  };

  const confirmReset = async (advogado) => {
    setResettingId(advogado.id);
    try {
      const res = await fetch(`/api/admin/advogados?id=${advogado.id}`, {
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

  const confirmUpdate = async (advogado, action, value = null) => {
    setUpdatingId(advogado.id);
    try {
      const res = await fetch("/api/admin/advogados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: advogado.id,
          action,
          value,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao atualizar advogado.");
        return;
      }

      toast.success(data.message);

      // Atualizar lista local
      setAdvogados((prev) =>
        prev.map((a) => {
          if (a.id === advogado.id) {
            if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
              const days = Number(value?.days || 30);
              const planType = value?.planType || 'PRO';
              const exp = new Date();
              exp.setDate(exp.getDate() + days);
              return {
                ...a,
                is_premium: true,
                plan_type: planType,
                premium_expires_at: exp.toISOString(),
              };
            }
            if (action === "REMOVE_PRO")
              return { ...a, is_premium: false, plan_type: 'FREE', premium_expires_at: null };
            if (action === "ADD_JURIS")
              return { ...a, balance: (a.balance || 0) + Number(value) };
            if (action === "REMOVE_JURIS")
              return {
                ...a,
                balance: Math.max(0, (a.balance || 0) - Number(value)),
              };
            if (action === "SET_OAB_STATUS")
              return { ...a, oab_verification_status: value };
            if (action === "UPDATE_OAB")
              return { ...a, oab: value.oab, estado: value.estado };
          }
          return a;
        }),
      );
    } catch (error) {
      console.error("Erro ao atualizar advogado:", error);
      toast.error("Erro ao atualizar advogado.");
    } finally {
      setUpdatingId(null);
      setModalAction(null);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // Page Title & Header Bar
      doc.setFillColor(13, 15, 18); // #0d0f12
      doc.rect(0, 0, 210, 35, "F");

      // Gold line
      doc.setFillColor(212, 175, 55); // #d4af37
      doc.rect(0, 35, 210, 1.5, "F");

      // Title text
      doc.setTextColor(212, 175, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SOCIAL JURÍDICO", 15, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("RELATÓRIO DE AUDITORIA - STATUS OAB", 15, 25);

      // Date in top right
      const nowStr = new Date().toLocaleString("pt-BR");
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${nowStr}`, 145, 25);

      // --- KPI CARDS ---
      const total = advogados.length;
      const verified = advogados.filter(a => a.oab_verification_status === "VERIFIED").length;
      const pending = advogados.filter(a => a.oab_verification_status === "PENDING" || !a.oab_verification_status).length;
      const error = advogados.filter(a => a.oab_verification_status === "ERROR").length;

      // Draw 4 cards
      // Card width: 43, gap: 5, startX: 15
      const cardW = 43;
      const cardH = 22;
      const cardY = 48;
      const cardGap = 5;

      const drawCard = (x, title, count, colorRGB) => {
        // Border
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "FD");

        // Title
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(title.toUpperCase(), x + 4, cardY + 7);

        // Count
        doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(String(count), x + 4, cardY + 16);
      };

      drawCard(15, "Total Cadastrados", total, [13, 15, 18]);
      drawCard(15 + cardW + cardGap, "OAB Verificadas", verified, [16, 185, 129]);
      drawCard(15 + (cardW + cardGap) * 2, "OAB Pendentes", pending, [245, 158, 11]);
      drawCard(15 + (cardW + cardGap) * 3, "Erros de Validação", error, [239, 68, 68]);

      // --- TABLE OF ADVOGADOS ---
      doc.setTextColor(13, 15, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("LISTAGEM DETALHADA DE ADVOGADOS", 15, 82);

      const tableData = advogados.map(a => [
        a.name || "-",
        a.email || "-",
        a.phone || "-",
        a.oab ? `${a.oab}/${a.estado || ""}` : "-",
        a.oab_verification_status === "VERIFIED" ? "Verificado" :
        a.oab_verification_status === "ERROR" ? "Erro" : "Pendente",
        a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "-"
      ]);

      autoTable(doc, {
        startY: 87,
        head: [["Nome", "E-mail", "Telefone", "OAB/UF", "Status OAB", "Cadastro"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [13, 15, 18],
          textColor: [212, 175, 55],
          fontStyle: "bold",
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          4: { fontStyle: "bold" } // Status column bold
        },
        didParseCell: function(data) {
          // Highlight status column
          if (data.column.index === 4 && data.cell.section === 'body') {
            const status = data.cell.raw;
            if (status === "Verificado") {
              data.cell.styles.textColor = [16, 185, 129]; // Green
            } else if (status === "Erro") {
              data.cell.styles.textColor = [239, 68, 68]; // Red
            } else {
              data.cell.styles.textColor = [217, 119, 6]; // Orange/Amber
            }
          }
        }
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        // line divider for footer
        doc.setFillColor(229, 231, 235);
        doc.rect(15, 282, 180, 0.2, "F");
        
        doc.text("Social Jurídico - Conectando o direito ao futuro.", 15, 288);
        doc.text(`Página ${i} de ${totalPages}`, 175, 288);
      }

      doc.save("Relatorio_Status_OAB_Advogados.pdf");
      toast.success("Relatório gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      toast.error("Ocorreu um erro ao carregar ou gerar o PDF.");
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

    const rows = filteredAdvogados.map((a) => {
      const fullName = a.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const givenName = nameParts[0] || "";
      const familyName = nameParts.slice(1).join(" ") || "";
      
      let phone = a.phone || "";
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

      const email = a.email || "";
      const tag = "Advogados SocialJurídico";

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
    link.setAttribute("download", "Advogados_Google_Contatos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV de Advogados exportado com sucesso!");
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
        body: JSON.stringify({ type: "ADVOGADOS" })
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
    return <div className={styles.loading}>Carregando advogados...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao painel admin
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 0 0' }}>
            <Scale size={18} /> Advogados cadastrados
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleGeneratePDF}
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #b8962e 100%)",
              color: "#0d0f12",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontWeight: "700",
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(212, 175, 55, 0.2)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(212, 175, 55, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.2)";
            }}
          >
            📄 Gerar Relatório PDF
          </button>
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
          <option value="ALL">Todos os advogados</option>
          <option value="7DAYS">Inativos há +7 dias</option>
          <option value="15DAYS">Inativos há +15 dias</option>
          <option value="30DAYS">Inativos há +30 dias</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        {filteredAdvogados.length === 0 ? (
          <p className={styles.empty}>Nenhum advogado encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>OAB</th>
                <th>Juris</th>
                <th>Plano</th>
                <th>OAB Status</th>
                <th>Expira em</th>
                <th>Último Login</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvogados.map((advogado) => (
                <tr key={advogado.id}>
                  <td>{advogado.name || "-"}</td>
                  <td>{advogado.email || "-"}</td>
                  <td>{advogado.phone || "-"}</td>
                  <td>{advogado.oab || "-"}</td>
                  <td>
                    <span className={styles.jurisBadge}>
                      {advogado.balance || 0}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        advogado.is_premium ? styles.proBadge : styles.freeBadge
                      }
                    >
                      {advogado.plan_type || (advogado.is_premium ? "PRO" : "FREE")}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        advogado.oab_verification_status === "VERIFIED"
                          ? styles.verifiedBadge
                          : advogado.oab_verification_status === "ERROR"
                            ? styles.errorBadge
                            : styles.pendingBadge
                      }
                    >
                      {advogado.oab_verification_status === "VERIFIED"
                        ? "Verificado"
                        : advogado.oab_verification_status === "ERROR"
                          ? "Erro"
                          : "Pendente"}
                    </span>
                  </td>
                  <td>
                    {advogado.is_premium && advogado.premium_expires_at
                      ? new Date(
                          advogado.premium_expires_at,
                        ).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    {advogado.last_sign_in_at
                      ? new Date(advogado.last_sign_in_at).toLocaleString("pt-BR")
                      : advogado.created_at
                        ? new Date(advogado.created_at).toLocaleString("pt-BR")
                        : "-"}
                  </td>
                  <td>
                    {advogado.created_at
                      ? new Date(advogado.created_at).toLocaleDateString(
                          "pt-BR",
                        )
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.manageBtn}
                        onClick={() => {
                          setModalAction({ type: "manage", item: advogado });
                          setEditOAB(advogado.oab || "");
                          setEditEstado(advogado.estado || "");
                        }}
                        disabled={updatingId === advogado.id}
                      >
                        <RotateCcw size={14} style={{ display: "none" }} />
                        Gerenciar
                      </button>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() =>
                          setModalAction({ type: "reset", item: advogado })
                        }
                        disabled={resettingId === advogado.id}
                      >
                        <RotateCcw size={14} />
                        Reset
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() =>
                          setModalAction({ type: "delete", item: advogado })
                        }
                        disabled={deletingId === advogado.id}
                      >
                        <Trash2 size={14} />
                        Excluir
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
                ? "Excluir advogado"
                : modalAction.type === "reset"
                  ? "Resetar senha"
                  : "Gerenciar Advogado"}
            </h3>

            <div className={styles.modalContent}>
              {modalAction.type === "manage" ? (
                <div className={styles.manageOptions}>
                  <p>
                    Advogado: <strong>{modalAction.item.name}</strong>
                  </p>

                  <div className={styles.manageSection}>
                    <h4>Gestão de Assinatura</h4>
                    <p className={styles.manageDesc}>
                      Conceda acesso START ou PRO por um período determinado.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <select 
                        className={styles.miniSelect}
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="START">Plano START</option>
                        <option value="PRO">Plano PRO</option>
                      </select>

                      <select 
                        className={styles.miniSelect}
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(Number(e.target.value))}
                        style={{ flex: 1 }}
                      >
                        <option value={7}>7 dias</option>
                        <option value={15}>15 dias</option>
                        <option value={30}>30 dias</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className={styles.giveProBtn}
                        onClick={() =>
                          confirmUpdate(modalAction.item, "GIVE_PLAN", { planType: selectedPlan, days: selectedDuration })
                        }
                        disabled={updatingId === modalAction.item.id}
                        style={{ flex: 2 }}
                      >
                        Conceder {selectedDuration} dias de {selectedPlan}
                      </button>

                      {modalAction.item.is_premium && (
                        <button
                          className={styles.removeProBtn}
                          onClick={() =>
                            confirmUpdate(modalAction.item, "REMOVE_PRO")
                          }
                          disabled={updatingId === modalAction.item.id}
                          style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.manageSection}>
                    <h4>Saldo de Juris</h4>
                    <p className={styles.manageDesc}>
                      Adicione uma quantia de Juris ao saldo atual (
                      {modalAction.item.balance || 0}).
                    </p>
                    <div className={styles.jurisInputRow}>
                      <input
                        type="number"
                        value={jurisAmount}
                        onChange={(e) => setJurisAmount(e.target.value)}
                        className={styles.numberInput}
                      />
                      <button
                        className={styles.addJurisBtn}
                        onClick={() =>
                          confirmUpdate(
                            modalAction.item,
                            "ADD_JURIS",
                            jurisAmount,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                      >
                        Adicionar
                      </button>
                      <button
                        className={styles.removeJurisBtn}
                        onClick={() =>
                          confirmUpdate(
                            modalAction.item,
                            "REMOVE_JURIS",
                            jurisAmount,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      >
                        Remover
                      </button>
                    </div>
                    <div className={styles.manageSection}>
                      <h4>Verificação de OAB</h4>
                      <p className={styles.manageDesc}>
                        Alterar o status de verificação da OAB do advogado.
                      </p>
                      <select
                        className={styles.statusSelect}
                        value={
                          modalAction.item.oab_verification_status || "PENDING"
                        }
                        onChange={(e) =>
                          confirmUpdate(
                            modalAction.item,
                            "SET_OAB_STATUS",
                            e.target.value,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                      >
                        <option
                          value="PENDING"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          🕒 Pendente
                        </option>
                        <option
                          value="VERIFIED"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          ✅ Verificado
                        </option>
                        <option
                          value="ERROR"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          ❌ Erro de Verificação
                        </option>
                      </select>
                    </div>

                    <div className={styles.manageSection}>
                      <h4>Dados Profissionais (OAB)</h4>
                      <p className={styles.manageDesc}>
                        Atualizar número da OAB e Estado de registro.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "10px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Nº OAB"
                          value={editOAB}
                          onChange={(e) => setEditOAB(e.target.value)}
                          className={styles.numberInput}
                          style={{ width: "120px" }}
                        />
                        <select
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value)}
                          className={styles.miniSelect}
                        >
                          <option value="">UF</option>
                          {ESTADOS.map((uf) => (
                            <option
                              key={uf}
                              value={uf}
                              style={{
                                background: "#171a21",
                                color: "#e5e7eb",
                              }}
                            >
                              {uf}
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.giveProBtn}
                          onClick={() =>
                            confirmUpdate(modalAction.item, "UPDATE_OAB", {
                              oab: editOAB,
                              estado: editEstado,
                            })
                          }
                          disabled={
                            updatingId === modalAction.item.id ||
                            !editOAB ||
                            !editEstado
                          }
                          style={{ margin: 0, flex: 1 }}
                        >
                          Salvar OAB
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>
                  {modalAction.type === "delete" ? (
                    <>
                      Confirma a exclusão de{" "}
                      <strong>{modalAction.item.name || "advogado"}</strong>?
                      Esta ação é irreversível.
                    </>
                  ) : (
                    <>
                      Confirma resetar a senha de{" "}
                      <strong>{modalAction.item.name || "advogado"}</strong>{" "}
                      para
                      <strong> socialjuridico1!</strong>?
                    </>
                  )}
                </p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModalAction(null)}
              >
                {modalAction.type === "manage" ? "Fechar" : "Cancelar"}
              </button>

              {modalAction.type !== "manage" && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
