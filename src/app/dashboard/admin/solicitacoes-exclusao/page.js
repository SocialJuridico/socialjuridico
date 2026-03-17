"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Scale, Calendar, User } from "lucide-react";
import toast from "react-hot-toast";
import styles from "../advogados/AdvogadosAdmin.module.css";

export default function AdminSolicitacoesExclusaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/solicitacoes-exclusao", {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Acesso negado");
          router.replace("/dashboard/cliente");
          return;
        }

        setSolicitacoes(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar solicitações:", error);
        toast.error("Erro ao carregar solicitações.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return <div className={styles.loading}>Carregando solicitações...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1 style={{ color: "#ef4444" }}>
          <Trash2 size={18} /> Solicitações de Exclusão de Conta
        </h1>
        <p style={{ marginTop: "10px", color: "rgba(255,255,255,0.6)" }}>
          Apenas o administrador pode excluir definitivamente um advogado da
          plataforma.
        </p>
      </header>

      <div className={styles.tableWrap} style={{ marginTop: "30px" }}>
        {solicitacoes.length === 0 ? (
          <p className={styles.empty}>Nenhuma solicitação pendente.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome Confirmado</th>
                <th>Email / Advogado</th>
                <th>Motivo da Saída</th>
                <th>Data da Solicitação</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((sol) => (
                <tr key={sol.id}>
                  <td style={{ fontWeight: 600 }}>{sol.nome}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{sol.advogados?.email || "N/A"}</span>
                      {/* ⚠️ SEGURANÇA: Não exibir UUID/ID Auth do usuário */}
                    </div>
                  </td>
                  <td
                    style={{
                      maxWidth: "300px",
                      fontSize: "0.85rem",
                      whiteSpace: "normal",
                    }}
                  >
                    {sol.motivo}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Calendar size={12} opacity={0.5} />
                      {new Date(sol.created_at).toLocaleString("pt-BR")}
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.freeBadge}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                      }}
                    >
                      {sol.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <h4
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <Scale size={16} color="var(--brand-gold)" /> Guia de Procedimento
        </h4>
        <ol
          style={{
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.7)",
            paddingLeft: "20px",
            lineHeight: "1.6",
          }}
        >
          <li>
            Verifique se o advogado possui <strong>Casos Ativos</strong> (status
            ABERTO ou EM ANDAMENTO) na aba de Advogados.
          </li>
          <li>Se houver casos ativos, entre em contato antes da exclusão.</li>
          <li>
            Para efetivar a exclusão, vá na aba{" "}
            <Link
              href="/dashboard/admin/advogados"
              style={{ color: "var(--brand-gold)" }}
            >
              Gerenciar Advogados
            </Link>{" "}
            e utilize o botão de excluir no perfil correspondente.
          </li>
          <li>
            Isso removerá os dados do banco de dados e o acesso ao sistema.
          </li>
        </ol>
      </div>
    </div>
  );
}
