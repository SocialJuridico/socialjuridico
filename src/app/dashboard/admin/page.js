"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Scale,
  FileText,
  Bell,
  MessageSquare,
  LogOut,
  Image as ImageIcon,
  UserCog,
  Trash2,
  Ticket,
  Star,
  DollarSign,
  Megaphone,
  Building,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalAdvogados: 0,
    totalCasos: 0,
    totalNotificacoes: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();

        if (!meRes.ok || !meData.success) {
          toast.error("Acesso restrito: área administrativa.");
          router.replace("/dashboard/cliente");
          return;
        }

        setAdmin(meData.data);

        const statsRes = await fetch("/api/admin/stats", { cache: "no-store" });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.success) {
          setStats(statsData.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard admin:", error);
        toast.error("Erro ao carregar dashboard administrativo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Carregando painel administrativo...</p>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <Shield size={18} />
          SocialJuridico Admin
        </Link>
        <div className={styles.adminCard}>
          <p className={styles.adminName}>{admin.name || "Administrador"}</p>
          <p className={styles.adminEmail}>{admin.email}</p>
        </div>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
        >
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Dashboard Administrativo</h1>
          <p>Visão geral da plataforma para usuários com perfil ADMIN.</p>
        </header>

        <div className={styles.sectionsWrapper}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Users size={20} /> Usuários & Perfis</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/clientes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Users size={16} /> Clientes</div>
                  <strong>{stats.totalClientes}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/advogados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Scale size={16} /> Advogados</div>
                  <strong>{stats.totalAdvogados}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/escritorios" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #00b4d8", background: "rgba(0, 180, 216, 0.03)" }}>
                  <div className={styles.cardTop}><Building size={16} color="#00b4d8" /> Escritórios (Enterprise)</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/admins" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><UserCog size={16} /> Admins</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/avaliacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: `4px solid #d4af37` }}>
                  <div className={styles.cardTop}><Star size={16} fill="#d4af37" color="#d4af37" /> Avaliações (Casos)</div>
                  <strong>Ver Notas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/pesquisas" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: `4px solid #d4af37` }}>
                  <div className={styles.cardTop}><Star size={16} fill="transparent" color="#d4af37" /> Pesquisas (Plataforma)</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Megaphone size={20} /> Comunicação & Marketing</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/push" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #3b82f6", background: 'rgba(59, 130, 246, 0.03)' }}>
                  <div className={styles.cardTop}><Megaphone size={16} color="#3b82f6" /> Push Notifications</div>
                  <strong>Disparar Alerta</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/notificacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Bell size={16} /> Minhas Mensagens</div>
                  <strong>Recebidas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/comunicados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Bell size={16} /> Comunicados Gerais</div>
                  <strong>{stats.totalNotificacoes}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/mensagens" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><MessageSquare size={16} /> Mensagens de Casos</div>
                  <strong>Conversas</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><FileText size={20} /> Operacional & Financeiro</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/casos" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><FileText size={16} /> Gestão de Casos</div>
                  <strong>{stats.totalCasos}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/transacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #10b981", background: 'rgba(16, 185, 129, 0.03)' }}>
                  <div className={styles.cardTop}><DollarSign size={16} color="#10b981" /> Gestão Financeira</div>
                  <strong>Ver Vendas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/anunciantes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #8b5cf6", background: 'rgba(139, 92, 246, 0.03)' }}>
                  <div className={styles.cardTop}><Megaphone size={16} color="#8b5cf6" /> Anunciantes de Serviços</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/afiliados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid var(--color-gold)" }}>
                  <div className={styles.cardTop}><Scale size={16} color="var(--color-gold)" /> Gestão de Afiliados</div>
                  <strong>Ver Indicações</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Shield size={20} /> Sistema & Configurações</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/banners" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><ImageIcon size={16} /> Banners do App</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/advogado-mes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid var(--color-gold)" }}>
                  <div className={styles.cardTop}><Star size={16} color="var(--color-gold)" /> Advogado do Mês</div>
                  <strong>Gerenciar Popup</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/cupons" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #10b981" }}>
                  <div className={styles.cardTop}><Ticket size={16} color="#10b981" /> Gestão de Cupons</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/avisos" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div className={styles.cardTop}><Bell size={16} color="#f59e0b" /> Configurar Avisos </div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/solicitacoes-exclusao" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #ef4444" }}>
                  <div className={styles.cardTop}><Trash2 size={16} color="#ef4444" /> LGPD: Exclusões</div>
                  <strong>Ver Pedidos</strong>
                </article>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
